import { UnauthorizedError, ValidationError } from '@shared/domain/errors';
import { StripePaymentProvider } from '@modules/billing/infrastructure/stripe-payment-provider';

const CONFIG = {
  successUrl: 'https://app.test/billing?topup=success',
  cancelUrl: 'https://app.test/billing?topup=cancelled',
  webhookSecret: 'whsec_test',
};

/** Minimal fake of the Stripe client surface the provider uses. */
function fakeStripe(overrides: { create?: jest.Mock; constructEvent?: jest.Mock }) {
  return {
    checkout: { sessions: { create: overrides.create ?? jest.fn() } },
    webhooks: { constructEvent: overrides.constructEvent ?? jest.fn() },
  } as unknown as ConstructorParameters<typeof StripePaymentProvider>[0];
}

describe('StripePaymentProvider.createCheckout', () => {
  it('opens a Checkout Session priced from the pack map and returns url + session id', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'cs_123', url: 'https://stripe/checkout/cs_123' });
    const provider = new StripePaymentProvider(fakeStripe({ create }), CONFIG);

    const result = await provider.createCheckout({
      paymentId: 'pay_1',
      userId: 'user_1',
      credits: 100,
    });

    expect(result).toEqual({
      checkoutUrl: 'https://stripe/checkout/cs_123',
      providerRef: 'cs_123',
    });

    const params = create.mock.calls[0]![0];
    expect(params.mode).toBe('payment');
    expect(params.client_reference_id).toBe('pay_1');
    expect(params.metadata).toEqual({ paymentId: 'pay_1', userId: 'user_1' });
    expect(params.success_url).toBe(CONFIG.successUrl);
    expect(params.cancel_url).toBe(CONFIG.cancelUrl);
    expect(params.line_items[0].quantity).toBe(1);
    expect(params.line_items[0].price_data).toMatchObject({
      currency: 'usd',
      unit_amount: 900, // 100 credits → $9.00
      product_data: { name: '100 credits' },
    });
  });

  it('rejects an unknown (unpriced) pack without calling Stripe', async () => {
    const create = jest.fn();
    const provider = new StripePaymentProvider(fakeStripe({ create }), CONFIG);

    await expect(
      provider.createCheckout({ paymentId: 'p', userId: 'u', credits: 777 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('StripePaymentProvider.parseWebhook', () => {
  function provider(constructEvent: jest.Mock) {
    return new StripePaymentProvider(fakeStripe({ constructEvent }), CONFIG);
  }

  it('throws Unauthorized when the signature does not verify', () => {
    const p = provider(
      jest.fn(() => {
        throw new Error('bad signature');
      }),
    );
    expect(() => p.parseWebhook(Buffer.from('{}'), 'sig')).toThrow(UnauthorizedError);
  });

  it('maps a paid checkout.session.completed to completed', () => {
    const p = provider(
      jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_9', payment_status: 'paid' } },
      }),
    );
    expect(p.parseWebhook(Buffer.from('{}'), 'sig')).toEqual({
      providerRef: 'cs_9',
      status: 'completed',
    });
  });

  it('ignores an unpaid completed session (returns null)', () => {
    const p = provider(
      jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_9', payment_status: 'unpaid' } },
      }),
    );
    expect(p.parseWebhook(Buffer.from('{}'), 'sig')).toBeNull();
  });

  it('maps expired / async_payment_failed to failed', () => {
    for (const type of ['checkout.session.expired', 'checkout.session.async_payment_failed']) {
      const p = provider(jest.fn().mockReturnValue({ type, data: { object: { id: 'cs_x' } } }));
      expect(p.parseWebhook(Buffer.from('{}'), 'sig')).toEqual({
        providerRef: 'cs_x',
        status: 'failed',
      });
    }
  });

  it('ignores unrelated events (returns null)', () => {
    const p = provider(
      jest.fn().mockReturnValue({ type: 'payment_intent.created', data: { object: {} } }),
    );
    expect(p.parseWebhook(Buffer.from('{}'), 'sig')).toBeNull();
  });
});
