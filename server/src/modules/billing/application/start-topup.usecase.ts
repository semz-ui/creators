import { CreditAmount } from '../domain/credit-amount';
import { Payment } from '../domain/payment.entity';
import type { IPaymentProvider } from '../domain/ports/payment-provider';
import type { IPaymentRepository } from '../domain/ports/payment-repository';
import type { TopUpResult } from './dto';

/**
 * Starts a credit top-up: records a pending payment, opens a provider checkout,
 * and returns the URL. Credits are only added once the provider confirms via
 * the webhook ({@link ConfirmPayment}).
 */
export class StartTopUp {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly provider: IPaymentProvider,
  ) {}

  async execute(userId: string, credits: number): Promise<TopUpResult> {
    const amount = CreditAmount.create(credits);

    const payment = Payment.create({ userId, credits: amount.value });
    const session = await this.provider.createCheckout({
      paymentId: payment.id,
      userId,
      credits: amount.value,
    });
    payment.attachProviderRef(session.providerRef);
    await this.payments.save(payment);

    return { paymentId: payment.id, checkoutUrl: session.checkoutUrl };
  }
}
