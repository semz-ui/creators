import type { BalanceResult, ICreditAccountStore } from '../domain/ports/credit-account-store';
import { CreditAccountModel, type CreditAccountDocument } from './credit-account.model';

/**
 * MongoDB credit-account store. Debits use an atomic conditional `$inc` so two
 * concurrent debits can't overdraw the balance. New accounts are seeded with
 * the configured free-credit grant.
 */
export class MongoCreditAccountStore implements ICreditAccountStore {
  constructor(private readonly initialCredits: number) {}

  async ensureAccount(userId: string): Promise<void> {
    const now = new Date();
    await CreditAccountModel.updateOne(
      { _id: userId },
      { $setOnInsert: { balance: this.initialCredits, createdAt: now, updatedAt: now } },
      { upsert: true },
    ).exec();
  }

  async getBalance(userId: string): Promise<number> {
    const doc = await CreditAccountModel.findById(userId).lean<CreditAccountDocument>().exec();
    return doc?.balance ?? 0;
  }

  async tryDebit(userId: string, amount: number): Promise<BalanceResult | null> {
    const doc = await CreditAccountModel.findOneAndUpdate(
      { _id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
      { new: true },
    )
      .lean<CreditAccountDocument>()
      .exec();
    return doc ? { balanceAfter: doc.balance } : null;
  }

  async credit(userId: string, amount: number): Promise<BalanceResult> {
    const now = new Date();
    const doc = await CreditAccountModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { balance: amount }, $set: { updatedAt: now }, $setOnInsert: { createdAt: now } },
      { new: true, upsert: true },
    )
      .lean<CreditAccountDocument>()
      .exec();
    return { balanceAfter: doc.balance };
  }
}
