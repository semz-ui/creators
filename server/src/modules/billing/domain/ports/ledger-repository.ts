import type { Tx } from '@shared/domain/ports/unit-of-work';

import type { LedgerEntry, LedgerReason, LedgerType } from '../ledger-entry.entity';

export interface ListOptions {
  limit: number;
  skip: number;
}

export interface PagedLedger {
  items: LedgerEntry[];
  total: number;
}

/** Append-only store of ledger entries. */
export interface ILedgerRepository {
  append(entry: LedgerEntry, tx?: Tx): Promise<void>;
  /**
   * Whether an entry already exists for this movement. Used to make crediting
   * idempotent on a reference (e.g. a payment or a video) so a retried webhook
   * or callback can't apply the same movement twice.
   */
  existsByReference(
    type: LedgerType,
    reason: LedgerReason,
    referenceId: string,
    tx?: Tx,
  ): Promise<boolean>;
  listByUser(userId: string, options: ListOptions): Promise<PagedLedger>;
}
