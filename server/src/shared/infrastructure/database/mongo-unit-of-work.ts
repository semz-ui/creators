import mongoose, { type ClientSession } from 'mongoose';

import type { IUnitOfWork, Tx } from '@shared/domain/ports/unit-of-work';

/**
 * Mongo-backed {@link IUnitOfWork} using a session + multi-document transaction.
 * `withTransaction` commits when `work` resolves and aborts (rolling back every
 * write tagged with the session) when it throws — and transparently retries on
 * transient transaction errors.
 *
 * NOTE: multi-document transactions require the MongoDB deployment to be a
 * replica set (a single-node replica set is sufficient). Tests that exercise
 * these paths spin up a {@link MongoMemoryReplSet} accordingly.
 */
export class MongoUnitOfWork implements IUnitOfWork {
  async run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
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
