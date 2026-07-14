import type { PagedResult, PublicLedgerEntry, TopUpResult } from '../application/dto';

import type {
  BalanceResponse,
  LedgerEntryResponse,
  LedgerPageResponse,
  TopUpResponse,
} from './billing.dto';

/**
 * Maps the billing application DTOs to the presentation DTOs sent on the wire.
 * Every field is enumerated here, so the presentation layer owns its contract.
 */

export function presentBalance(result: { balance: number }): BalanceResponse {
  return {
    balance: result.balance,
  };
}

export function presentLedgerEntry(entry: PublicLedgerEntry): LedgerEntryResponse {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    reason: entry.reason,
    referenceId: entry.referenceId,
    balanceAfter: entry.balanceAfter,
    createdAt: entry.createdAt,
  };
}

export function presentLedgerPage(page: PagedResult<PublicLedgerEntry>): LedgerPageResponse {
  return {
    items: page.items.map(presentLedgerEntry),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}

export function presentTopUp(result: TopUpResult): TopUpResponse {
  return {
    paymentId: result.paymentId,
    checkoutUrl: result.checkoutUrl,
  };
}
