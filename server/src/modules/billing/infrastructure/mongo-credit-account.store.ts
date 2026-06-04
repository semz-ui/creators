import { asSession, sessionOption } from '@shared/infrastructure/database/mongo-unit-of-work';
import type { Tx } from '@shared/domain/ports/unit-of-work';

import type { BalanceResult, ICreditAccountStore } from '../domain/ports/credit-account-store';
import { CreditAccountModel, type CreditAccountDocument } from './credit-account.model';

/**
 * MongoDB credit-account store. Debits use an atomic conditional `$inc` so two
 * concurrent debits can't overdraw the balance. New accounts are seeded with
 * the configured free-credit grant. Each call joins the caller's transaction
 * when a {@link Tx} is supplied.
 */
export class MongoCreditAccountStore implements ICreditAccountStore {
  constructor(private readonly initialCredits: number) {}

  async ensureAccount(userId: string, tx?: Tx): Promise<void> {
    const now = new Date();
    await CreditAccountModel.updateOne(
      { _id: userId },
      { $setOnInsert: { balance: this.initialCredits, createdAt: now, updatedAt: now } },
      { upsert: true, ...sessionOption(tx) },
    ).exec();
  }

  async getBalance(userId: string, tx?: Tx): Promise<number> {
    const doc = await CreditAccountModel.findById(userId)
      .session(asSession(tx) ?? null)
      .lean<CreditAccountDocument>()
      .exec();
    return doc?.balance ?? 0;
  }

  async tryDebit(userId: string, amount: number, tx?: Tx): Promise<BalanceResult | null> {
    const doc = await CreditAccountModel.findOneAndUpdate(
      { _id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
      { new: true, ...sessionOption(tx) },
    )
      .lean<CreditAccountDocument>()
      .exec();
    return doc ? { balanceAfter: doc.balance } : null;
  }

  async credit(userId: string, amount: number, tx?: Tx): Promise<BalanceResult> {
    const now = new Date();
    const doc = await CreditAccountModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { balance: amount }, $set: { updatedAt: now }, $setOnInsert: { createdAt: now } },
      { new: true, upsert: true, ...sessionOption(tx) },
    )
      .lean<CreditAccountDocument>()
      .exec();
    return { balanceAfter: doc.balance };
  }
}
