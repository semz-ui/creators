import type { PagedResult, PublicLedgerEntry, TopUpResult } from '../application/dto';

/**
 * Wire shapes for the billing module: every field this API returns is
 * enumerated here, so the presentation layer — not the use-case DTO — owns
 * the contract.
 */

export function presentBalance(result: { balance: number }) {
  return {
    balance: result.balance,
  };
}

export function presentLedgerEntry(entry: PublicLedgerEntry) {
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

export function presentLedgerPage(page: PagedResult<PublicLedgerEntry>) {
  return {
    items: page.items.map(presentLedgerEntry),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}

export function presentTopUp(result: TopUpResult) {
  return {
    paymentId: result.paymentId,
    checkoutUrl: result.checkoutUrl,
  };
}
