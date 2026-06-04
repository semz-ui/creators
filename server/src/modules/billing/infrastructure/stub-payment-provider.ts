import { randomUUID } from 'node:crypto';

import type { CheckoutSession, IPaymentProvider } from '../domain/ports/payment-provider';

/**
 * Placeholder payment provider: returns a fake checkout URL + reference. A real
 * provider (e.g. Stripe Checkout) drops in behind {@link IPaymentProvider};
 * completion arrives via the payment webhook.
 */
export class StubPaymentProvider implements IPaymentProvider {
  async createCheckout(_params: {
    paymentId: string;
    userId: string;
    credits: number;
  }): Promise<CheckoutSession> {
    const providerRef = `pay_${randomUUID().slice(0, 12)}`;
    return { providerRef, checkoutUrl: `https://payments.stub.local/checkout/${providerRef}` };
  }
}
