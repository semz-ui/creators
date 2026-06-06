import type Stripe from 'stripe';

import { UnauthorizedError, ValidationError } from '@shared/domain/errors';

import {
  CREDIT_PACK_CURRENCY,
  CREDIT_PACK_PRICE_CENTS,
  isCreditPack,
} from '../domain/credit-packs';
import type {
  CheckoutSession,
  IPaymentProvider,
  PaymentConfirmation,
} from '../domain/ports/payment-provider';

export interface StripeConfig {
  /** Where Stripe sends the buyer after a successful / cancelled checkout. */
  successUrl: string;
  cancelUrl: string;
  /** Endpoint signing secret (`whsec_…`) used to verify webhook payloads. */
  webhookSecret: string;
}

/**
 * Stripe Checkout implementation of {@link IPaymentProvider}. `createCheckout`
 * opens a hosted Checkout Session priced inline from {@link CREDIT_PACK_PRICE_CENTS}
 * (no pre-created Stripe products), linking it back to our Payment via
 * `client_reference_id`. `parseWebhook` verifies the Stripe signature against the
 * raw body and maps the relevant events to a {@link PaymentConfirmation}. The
 * Checkout Session id is the `providerRef` echoed on the webhook.
 */
export class StripePaymentProvider implements IPaymentProvider {
  readonly signatureHeader = 'stripe-signature';

  constructor(
    private readonly stripe: Stripe.Stripe,
    private readonly config: StripeConfig,
  ) {}

  async createCheckout(params: {
    paymentId: string;
    userId: string;
    credits: number;
  }): Promise<CheckoutSession> {
    const unitAmount = CREDIT_PACK_PRICE_CENTS[params.credits];
    if (unitAmount === undefined || !isCreditPack(params.credits)) {
      throw new ValidationError(`Unknown credit pack: ${params.credits}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CREDIT_PACK_CURRENCY,
            unit_amount: unitAmount,
            product_data: { name: `${params.credits} credits` },
          },
        },
      ],
      success_url: this.config.successUrl,
      cancel_url: this.config.cancelUrl,
      client_reference_id: params.paymentId,
      metadata: { paymentId: params.paymentId, userId: params.userId },
    });

    if (!session.url) {
      throw new Error('Stripe: checkout session created without a url');
    }
    return { checkoutUrl: session.url, providerRef: session.id };
  }

  parseWebhook(rawBody: Buffer, signature: string): PaymentConfirmation | null {
    const event = this.verifyEvent(rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // `paid` is the terminal success; an unpaid `completed` (e.g. a pending
        // async method) is ignored until its succeeded/failed event arrives.
        return session.payment_status === 'paid'
          ? { providerRef: session.id, status: 'completed' }
          : null;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        return { providerRef: event.data.object.id, status: 'failed' };
      default:
        return null; // irrelevant event — acknowledge and ignore
    }
  }

  /** Verify the signature against the raw bytes; throws on tampering/mismatch. */
  private verifyEvent(rawBody: Buffer, signature: string) {
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);
    } catch {
      throw new UnauthorizedError('Invalid Stripe webhook signature');
    }
  }
}
