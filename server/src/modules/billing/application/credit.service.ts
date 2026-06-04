import type { IUnitOfWork, Tx } from '@shared/domain/ports/unit-of-work';

import { InsufficientCreditsError } from '../domain/billing.errors';
import { CreditAmount } from '../domain/credit-amount';
import { LedgerEntry, type LedgerReason } from '../domain/ledger-entry.entity';
import type { ICreditAccountStore } from '../domain/ports/credit-account-store';
import type { ILedgerRepository } from '../domain/ports/ledger-repository';

/**
 * Application service that moves credits and records the ledger together. The
 * single choke-point for balance changes (used by the use cases and the video
 * credit guard). Each movement runs in one transaction so the balance update
 * and its ledger entry commit or roll back together; callers may pass an
 * existing {@link Tx} to enlist the movement in a wider transaction.
 */
export class CreditService {
  constructor(
    private readonly accounts: ICreditAccountStore,
    private readonly ledger: ILedgerRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async getBalance(userId: string): Promise<number> {
    await this.accounts.ensureAccount(userId);
    return this.accounts.getBalance(userId);
  }

  /** Debit `amount`, recording a ledger entry atomically. Throws 402 if insufficient. */
  async debit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    referenceId: string | null,
    tx?: Tx,
  ): Promise<number> {
    CreditAmount.create(amount);
    const work = async (t: Tx): Promise<number> => {
      await this.accounts.ensureAccount(userId, t);
      const result = await this.accounts.tryDebit(userId, amount, t);
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
        t,
      );
      return result.balanceAfter;
    };
    return tx ? work(tx) : this.uow.run(work);
  }

  /**
   * Add `amount`, recording a ledger entry atomically. Idempotent on
   * `referenceId`: if a credit for the same reason+reference was already
   * applied, this is a no-op returning the current balance — so a retried
   * top-up webhook or refund callback can't grant the credits twice.
   */
  async credit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    referenceId: string | null,
    tx?: Tx,
  ): Promise<number> {
    CreditAmount.create(amount);
    const work = async (t: Tx): Promise<number> => {
      await this.accounts.ensureAccount(userId, t);
      if (
        referenceId !== null &&
        (await this.ledger.existsByReference('credit', reason, referenceId, t))
      ) {
        return this.accounts.getBalance(userId, t);
      }
      const result = await this.accounts.credit(userId, amount, t);
      await this.ledger.append(
        LedgerEntry.record({
          userId,
          type: 'credit',
          amount,
          reason,
          referenceId,
          balanceAfter: result.balanceAfter,
        }),
        t,
      );
      return result.balanceAfter;
    };
    return tx ? work(tx) : this.uow.run(work);
  }
}
