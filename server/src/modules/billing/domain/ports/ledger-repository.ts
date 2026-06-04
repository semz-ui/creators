import type { LedgerEntry } from '../ledger-entry.entity';

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
  append(entry: LedgerEntry): Promise<void>;
  listByUser(userId: string, options: ListOptions): Promise<PagedLedger>;
}
