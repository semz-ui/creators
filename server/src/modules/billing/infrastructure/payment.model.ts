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

paymentSchema.index({ providerRef: 1 }, { sparse: true });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
