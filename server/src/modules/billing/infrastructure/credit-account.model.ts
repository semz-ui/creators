import { Schema, model } from 'mongoose';

/** One credit account per user; `_id` is the userId. */
export interface CreditAccountDocument {
  _id: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const creditAccountSchema = new Schema<CreditAccountDocument>(
  {
    _id: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const CreditAccountModel = model<CreditAccountDocument>(
  'CreditAccount',
  creditAccountSchema,
);
