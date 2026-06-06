import { randomUUID, timingSafeEqual } from 'node:crypto';

import { UnauthorizedError, ValidationError } from '@shared/domain/errors';

import type {
  CheckoutSession,
  IPaymentProvider,
  PaymentConfirmation,
} from '../domain/ports/payment-provider';
import { paymentWebhookSchema } from '../presentation/billing.validators';

/**
 * Placeholder payment provider for local dev / tests: returns a fake checkout
 * URL and confirms via a simple shared-secret webhook carrying
 * `{ providerRef, status }`. The real {@link StripePaymentProvider} drops in
 * behind {@link IPaymentProvider} when Stripe keys are configured.
 */
export class StubPaymentProvider implements IPaymentProvider {
  readonly signatureHeader = 'x-payment-secret';

  constructor(private readonly secret: string) {}

  async createCheckout(_params: {
    paymentId: string;
    userId: string;
    credits: number;
  }): Promise<CheckoutSession> {
    const providerRef = `pay_${randomUUID().slice(0, 12)}`;
    return { providerRef, checkoutUrl: `https://payments.stub.local/checkout/${providerRef}` };
  }

  parseWebhook(rawBody: Buffer, signature: string): PaymentConfirmation {
    // Constant-time secret check so it can't be recovered by timing.
    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(this.secret, 'utf8');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedError('Invalid payment webhook secret');
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody.toString('utf8') || '{}');
    } catch {
      throw new ValidationError('Malformed payment webhook body');
    }
    const parsed = paymentWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid payment webhook body');
    }
    return parsed.data;
  }
}
