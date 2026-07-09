import mongoose, { type ClientSession } from 'mongoose';

import type { IUnitOfWork, Tx } from '@shared/domain/ports/unit-of-work';
import { logger } from '@shared/infrastructure/logging/logger';

/**
 * Mongo-backed {@link IUnitOfWork} using a session + multi-document transaction.
 * `withTransaction` commits when `work` resolves and aborts (rolling back every
 * write tagged with the session) when it throws — and transparently retries on
 * transient transaction errors.
 *
 * NOTE: multi-document transactions require the MongoDB deployment to be a
 * replica set (a single-node replica set is sufficient). Tests that exercise
 * these paths spin up a {@link MongoMemoryReplSet} accordingly.
 *
 * Standalone fallback: a plain standalone `mongod` (common in local dev) rejects
 * any write carrying a transaction number with "Transaction numbers are only
 * allowed on a replica set member or mongos". When we detect that, we degrade to
 * running `work` WITHOUT a session — the repository adapters already treat a
 * missing tx as "no session" (`asSession(tx) ?? null`, `sessionOption(undefined)`),
 * so the writes still apply, just without cross-document atomicity. We warn once
 * and remember the deployment can't do transactions so later calls skip the
 * doomed transaction attempt entirely.
 */
export class MongoUnitOfWork implements IUnitOfWork {
  /** Latches once we learn the deployment is a standalone (no transactions). */
  private transactionsUnsupported = false;

  async run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    if (this.transactionsUnsupported) {
      return work(undefined);
    }

    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result as T;
    } catch (err) {
      if (!isStandaloneTransactionError(err)) throw err;
      // First time we hit a standalone deployment: latch and retry sessionless.
      this.transactionsUnsupported = true;
      logger.warn(
        'MongoDB deployment does not support multi-document transactions ' +
          '(standalone, not a replica set). Falling back to non-transactional ' +
          'writes — cross-document atomicity is NOT guaranteed. Run MongoDB as a ' +
          'replica set for transactional integrity.',
      );
      return work(undefined);
    } finally {
      await session.endSession();
    }
  }
}

/**
 * True when an error is MongoDB rejecting a transaction number because the
 * deployment is a standalone (not a replica set / mongos). Matched by code 20
 * (IllegalOperation) plus the distinctive message, since the same code covers
 * other illegal operations.
 */
function isStandaloneTransactionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { code, codeName, message } = err as {
    code?: unknown;
    codeName?: unknown;
    message?: unknown;
  };
  const isIllegalOp = code === 20 || codeName === 'IllegalOperation';
  const mentionsTxnNumbers =
    typeof message === 'string' && message.includes('Transaction numbers are only allowed');
  return isIllegalOp && mentionsTxnNumbers;
}

/** Narrow an opaque {@link Tx} back to a Mongo session for the `.session()` query helper. */
export function asSession(tx?: Tx): ClientSession | undefined {
  return (tx as ClientSession | undefined) ?? undefined;
}

/**
 * Build the `session` slice of a query/update options object — omitted entirely
 * when there's no transaction, so it stays valid under `exactOptionalPropertyTypes`
 * (which forbids an explicit `session: undefined`).
 */
export function sessionOption(tx?: Tx): { session?: ClientSession } {
  const session = tx as ClientSession | undefined;
  return session ? { session } : {};
}
