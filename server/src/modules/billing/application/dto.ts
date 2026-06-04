import type { LedgerEntry } from '../domain/ledger-entry.entity';

export interface PublicLedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: 'topup' | 'generation' | 'refund';
  referenceId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface TopUpResult {
  paymentId: string;
  checkoutUrl: string;
}

export function toPublicLedgerEntry(entry: LedgerEntry): PublicLedgerEntry {
  return entry.toPublic();
}
