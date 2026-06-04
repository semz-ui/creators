import type { Tx } from '@shared/domain/ports/unit-of-work';

export interface BalanceResult {
  balanceAfter: number;
}

/**
 * Atomic credit-account operations. The non-negative-balance invariant is
 * enforced here (a conditional debit), so concurrent debits can't overdraw.
 * Every mutating call accepts an optional {@link Tx} so the balance change can
 * join the same transaction as its ledger entry.
 */
export interface ICreditAccountStore {
  /** Create the account with the initial free-credit grant if it doesn't exist. */
  ensureAccount(userId: string, tx?: Tx): Promise<void>;
  getBalance(userId: string, tx?: Tx): Promise<number>;
  /** Atomically debit; resolves null if the balance is insufficient. */
  tryDebit(userId: string, amount: number, tx?: Tx): Promise<BalanceResult | null>;
  /** Atomically add credits. */
  credit(userId: string, amount: number, tx?: Tx): Promise<BalanceResult>;
}
