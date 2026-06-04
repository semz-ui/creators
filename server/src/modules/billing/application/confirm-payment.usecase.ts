import type { IUnitOfWork } from '@shared/domain/ports/unit-of-work';

import type { IPaymentRepository } from '../domain/ports/payment-repository';
import type { CreditService } from './credit.service';

export interface ConfirmPaymentInput {
  providerRef: string;
  status: 'completed' | 'failed';
}

/**
 * Applies a payment-provider webhook. Idempotent: an unknown ref or an
 * already-completed payment is a no-op, so provider retries can't double-credit.
 * The claim (mark completed) and the credit run in one transaction, so they
 * commit together — a crash can't leave a completed payment without its credits,
 * and the re-read inside the transaction makes concurrent deliveries safe.
 */
export class ConfirmPayment {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly credits: CreditService,
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<void> {
    await this.uow.run(async (tx) => {
      const payment = await this.payments.findByProviderRef(input.providerRef, tx);
      if (!payment || payment.isCompleted()) {
        return;
      }

      if (input.status !== 'completed') {
        payment.markFailed();
        await this.payments.save(payment, tx);
        return;
      }

      payment.markCompleted();
      await this.payments.save(payment, tx);
      await this.credits.credit(payment.userId, payment.credits, 'topup', payment.id, tx);
    });
  }
}
