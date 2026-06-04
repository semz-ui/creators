import { LedgerEntry } from '../domain/ledger-entry.entity';
import type {
  ILedgerRepository,
  ListOptions,
  PagedLedger,
} from '../domain/ports/ledger-repository';
import { LedgerEntryModel, type LedgerEntryDocument } from './ledger-entry.model';

/** MongoDB append-only ledger. */
export class MongoLedgerRepository implements ILedgerRepository {
  async append(entry: LedgerEntry): Promise<void> {
    const s = entry.toSnapshot();
    await LedgerEntryModel.create({
      _id: s.id,
      userId: s.userId,
      type: s.type,
      amount: s.amount,
      reason: s.reason,
      referenceId: s.referenceId,
      balanceAfter: s.balanceAfter,
      createdAt: s.createdAt,
    });
  }

  async listByUser(userId: string, options: ListOptions): Promise<PagedLedger> {
    const [docs, total] = await Promise.all([
      LedgerEntryModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean<LedgerEntryDocument[]>()
        .exec(),
      LedgerEntryModel.countDocuments({ userId }).exec(),
    ]);

    const items = docs.map((doc) =>
      LedgerEntry.fromSnapshot({
        id: doc._id,
        userId: doc.userId,
        type: doc.type,
        amount: doc.amount,
        reason: doc.reason,
        referenceId: doc.referenceId ?? null,
        balanceAfter: doc.balanceAfter,
        createdAt: doc.createdAt,
      }),
    );
    return { items, total };
  }
}
