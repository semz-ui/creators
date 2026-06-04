import { Schema, model } from 'mongoose';

import type { LedgerReason, LedgerType } from '../domain/ledger-entry.entity';

export interface LedgerEntryDocument {
  _id: string;
  userId: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

const ledgerEntrySchema = new Schema<LedgerEntryDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    referenceId: { type: String, default: null },
    balanceAfter: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

ledgerEntrySchema.index({ userId: 1, createdAt: -1 });

// At most one entry per (type, reason, referenceId) movement. Backs the
// idempotent credit path so a retried webhook/callback can't double-apply.
// Partial so the many entries without a reference don't collide on null.
ledgerEntrySchema.index(
  { type: 1, reason: 1, referenceId: 1 },
  { unique: true, partialFilterExpression: { referenceId: { $type: 'string' } } },
);

export const LedgerEntryModel = model<LedgerEntryDocument>('LedgerEntry', ledgerEntrySchema);
