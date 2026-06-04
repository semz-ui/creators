import type { Payment } from '../payment.entity';

/** Persistence port for top-up payments. */
export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByProviderRef(providerRef: string): Promise<Payment | null>;
}
