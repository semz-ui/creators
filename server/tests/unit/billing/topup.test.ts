import { ConfirmPayment } from '@modules/billing/application/confirm-payment.usecase';
import type { CreditService } from '@modules/billing/application/credit.service';
import { StartTopUp } from '@modules/billing/application/start-topup.usecase';
import { Payment } from '@modules/billing/domain/payment.entity';
import type { IPaymentProvider } from '@modules/billing/domain/ports/payment-provider';
import type { IPaymentRepository } from '@modules/billing/domain/ports/payment-repository';
import type { IUnitOfWork } from '@shared/domain/ports/unit-of-work';

// Runs the work directly (no real transaction), passing an undefined tx through.
function fakeUow(): IUnitOfWork {
  return { run: (work) => work(undefined) };
}

function paymentsMock() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByProviderRef: jest.fn(),
  } satisfies Record<keyof IPaymentRepository, jest.Mock>;
}

describe('StartTopUp', () => {
  it('creates a pending payment, opens checkout, and stores the provider ref', async () => {
    const payments = paymentsMock();
    const provider: IPaymentProvider = {
      createCheckout: jest
        .fn()
        .mockResolvedValue({ providerRef: 'pay_abc', checkoutUrl: 'https://pay/checkout/abc' }),
    };

    const result = await new StartTopUp(payments, provider).execute('u1', 50);

    expect(result.checkoutUrl).toBe('https://pay/checkout/abc');
    expect(result.paymentId).toEqual(expect.any(String));
    const saved = payments.save.mock.calls[0][0].toSnapshot();
    expect(saved).toMatchObject({
      userId: 'u1',
      credits: 50,
      status: 'pending',
      providerRef: 'pay_abc',
    });
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      new StartTopUp(paymentsMock(), { createCheckout: jest.fn() }).execute('u1', 0),
    ).rejects.toThrow();
  });
});

describe('ConfirmPayment', () => {
  function creditServiceMock() {
    return { credit: jest.fn().mockResolvedValue(150) } as unknown as CreditService;
  }

  it('credits the account once on completion', async () => {
    const payments = paymentsMock();
    const payment = Payment.create({ userId: 'u1', credits: 50 });
    payment.attachProviderRef('pay_abc');
    payments.findByProviderRef.mockResolvedValue(payment);
    const credits = creditServiceMock();

    await new ConfirmPayment(payments, credits, fakeUow()).execute({
      providerRef: 'pay_abc',
      status: 'completed',
    });

    expect(payments.save).toHaveBeenCalled();
    expect(credits.credit).toHaveBeenCalledWith('u1', 50, 'topup', payment.id, undefined);
  });

  it('is idempotent for an already-completed payment', async () => {
    const payments = paymentsMock();
    const payment = Payment.create({ userId: 'u1', credits: 50 });
    payment.markCompleted();
    payments.findByProviderRef.mockResolvedValue(payment);
    const credits = creditServiceMock();

    await new ConfirmPayment(payments, credits, fakeUow()).execute({
      providerRef: 'pay_abc',
      status: 'completed',
    });

    expect(credits.credit).not.toHaveBeenCalled();
  });

  it('no-ops for an unknown provider ref', async () => {
    const payments = paymentsMock();
    payments.findByProviderRef.mockResolvedValue(null);
    const credits = creditServiceMock();

    await new ConfirmPayment(payments, credits, fakeUow()).execute({
      providerRef: 'ghost',
      status: 'completed',
    });

    expect(credits.credit).not.toHaveBeenCalled();
  });

  it('marks failed without crediting on a failed status', async () => {
    const payments = paymentsMock();
    const payment = Payment.create({ userId: 'u1', credits: 50 });
    payment.attachProviderRef('pay_abc');
    payments.findByProviderRef.mockResolvedValue(payment);
    const credits = creditServiceMock();

    await new ConfirmPayment(payments, credits, fakeUow()).execute({
      providerRef: 'pay_abc',
      status: 'failed',
    });

    expect(payment.status).toBe('failed');
    expect(credits.credit).not.toHaveBeenCalled();
  });
});
