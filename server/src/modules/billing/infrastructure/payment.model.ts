import { Schema, model } from 'mongoose';

import type { PaymentStatus } from '../domain/payment.entity';

export interface PaymentDocument {
  _id: string;
  userId: string;
  credits: number;
  status: PaymentStatus;
  providerRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    credits: { type: Number, required: true },
    status: { type: String, required: true },
    providerRef: { type: String, default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// One payment per provider reference — enforces webhook idempotency at the DB
// level. Sparse so the (transient) pre-attach `null` refs don't collide.
paymentSchema.index({ providerRef: 1 }, { unique: true, sparse: true });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
