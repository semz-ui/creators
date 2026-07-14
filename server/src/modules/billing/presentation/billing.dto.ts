/**
 * Presentation-layer DTOs for the billing module: the exact JSON shapes this
 * API puts on the wire. Owned by the presentation layer and deliberately
 * separate from the application DTOs (`application/dto.ts`) — the presenter
 * maps one to the other so neither layer's contract drifts into the other.
 */

export interface BalanceResponse {
  balance: number;
}

export interface LedgerEntryResponse {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: 'topup' | 'generation' | 'refund';
  referenceId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

export interface LedgerPageResponse {
  items: LedgerEntryResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface TopUpResponse {
  paymentId: string;
  checkoutUrl: string;
}
