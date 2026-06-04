import type { Tx } from '@shared/domain/ports/unit-of-work';

import type { Payment } from '../payment.entity';

/** Persistence port for top-up payments. */
export interface IPaymentRepository {
  save(payment: Payment, tx?: Tx): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByProviderRef(providerRef: string, tx?: Tx): Promise<Payment | null>;
}
