import type { IPaymentRepository } from '../domain/ports/payment-repository';
import type { CreditService } from './credit.service';

export interface ConfirmPaymentInput {
  providerRef: string;
  status: 'completed' | 'failed';
}

/**
 * Applies a payment-provider webhook. Idempotent: an unknown ref or an
 * already-completed payment is a no-op, so provider retries can't double-credit.
 * Claims the payment (marks completed) before crediting so a retry never grants
 * credits twice. (A real impl would wrap this in a DB transaction.)
 */
export class ConfirmPayment {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly credits: CreditService,
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<void> {
    const payment = await this.payments.findByProviderRef(input.providerRef);
    if (!payment || payment.isCompleted()) {
      return;
    }

    if (input.status !== 'completed') {
      payment.markFailed();
      await this.payments.save(payment);
      return;
    }

    payment.markCompleted();
    await this.payments.save(payment);
    await this.credits.credit(payment.userId, payment.credits, 'topup', payment.id);
  }
}
