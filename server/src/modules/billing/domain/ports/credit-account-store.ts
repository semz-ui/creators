export interface BalanceResult {
  balanceAfter: number;
}

/**
 * Atomic credit-account operations. The non-negative-balance invariant is
 * enforced here (a conditional debit), so concurrent debits can't overdraw.
 */
export interface ICreditAccountStore {
  /** Create the account with the initial free-credit grant if it doesn't exist. */
  ensureAccount(userId: string): Promise<void>;
  getBalance(userId: string): Promise<number>;
  /** Atomically debit; resolves null if the balance is insufficient. */
  tryDebit(userId: string, amount: number): Promise<BalanceResult | null>;
  /** Atomically add credits. */
  credit(userId: string, amount: number): Promise<BalanceResult>;
}
