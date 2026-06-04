import { InsufficientCreditsError } from '../domain/billing.errors';
import { LedgerEntry, type LedgerReason } from '../domain/ledger-entry.entity';
import type { ICreditAccountStore } from '../domain/ports/credit-account-store';
import type { ILedgerRepository } from '../domain/ports/ledger-repository';

/**
 * Application service that moves credits and records the ledger together. The
 * single choke-point for balance changes (used by the use cases and the
 * video credit guard).
 */
export class CreditService {
  constructor(
    private readonly accounts: ICreditAccountStore,
    private readonly ledger: ILedgerRepository,
  ) {}

  async getBalance(userId: string): Promise<number> {
    await this.accounts.ensureAccount(userId);
    return this.accounts.getBalance(userId);
  }

  /** Debit `amount`, recording a ledger entry. Throws 402 if insufficient. */
  async debit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    referenceId: string | null,
  ): Promise<number> {
    await this.accounts.ensureAccount(userId);
    const result = await this.accounts.tryDebit(userId, amount);
    if (!result) {
      throw new InsufficientCreditsError();
    }
    await this.ledger.append(
      LedgerEntry.record({
        userId,
        type: 'debit',
        amount,
        reason,
        referenceId,
        balanceAfter: result.balanceAfter,
      }),
    );
    return result.balanceAfter;
  }

  /** Add `amount`, recording a ledger entry. */
  async credit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    referenceId: string | null,
  ): Promise<number> {
    await this.accounts.ensureAccount(userId);
    const result = await this.accounts.credit(userId, amount);
    await this.ledger.append(
      LedgerEntry.record({
        userId,
        type: 'credit',
        amount,
        reason,
        referenceId,
        balanceAfter: result.balanceAfter,
      }),
    );
    return result.balanceAfter;
  }
}
