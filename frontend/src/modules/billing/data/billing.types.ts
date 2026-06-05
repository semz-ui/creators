export type LedgerType = 'credit' | 'debit';
export type LedgerReason = 'topup' | 'generation' | 'refund';

export interface Balance {
  balance: number;
}

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface LedgerPage {
  items: LedgerEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface TopUpResult {
  paymentId: string;
  checkoutUrl: string;
}
