import { asSession, sessionOption } from '@shared/infrastructure/database/mongo-unit-of-work';
import type { Tx } from '@shared/domain/ports/unit-of-work';

import { Payment } from '../domain/payment.entity';
import type { IPaymentRepository } from '../domain/ports/payment-repository';
import { PaymentModel, type PaymentDocument } from './payment.model';

/** MongoDB implementation of {@link IPaymentRepository}. */
export class MongoPaymentRepository implements IPaymentRepository {
  async save(payment: Payment, tx?: Tx): Promise<void> {
    const s = payment.toSnapshot();
    await PaymentModel.updateOne(
      { _id: s.id },
      {
        $set: {
          userId: s.userId,
          credits: s.credits,
          status: s.status,
          providerRef: s.providerRef,
          updatedAt: s.updatedAt,
        },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true, ...sessionOption(tx) },
    ).exec();
  }

  async findById(id: string): Promise<Payment | null> {
    const doc = await PaymentModel.findById(id).lean<PaymentDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByProviderRef(providerRef: string, tx?: Tx): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ providerRef })
      .session(asSession(tx) ?? null)
      .lean<PaymentDocument>()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: PaymentDocument): Payment {
    return Payment.fromSnapshot({
      id: doc._id,
      userId: doc.userId,
      credits: doc.credits,
      status: doc.status,
      providerRef: doc.providerRef ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
