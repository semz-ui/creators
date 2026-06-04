import type { CreditService } from '@modules/billing/application/credit.service';
import { CreditGuardAdapter } from '@modules/billing/infrastructure/credit-guard.adapter';

describe('CreditGuardAdapter', () => {
  function serviceMock() {
    return {
      debit: jest.fn().mockResolvedValue(90),
      credit: jest.fn().mockResolvedValue(100),
    } as unknown as CreditService;
  }

  it('debits the flat generation cost on authorize', async () => {
    const service = serviceMock();
    await new CreditGuardAdapter(service, 10).authorizeGeneration('u1', {
      videoId: 'v1',
      durationSeconds: 30,
    });
    expect(service.debit).toHaveBeenCalledWith('u1', 10, 'generation', 'v1');
  });

  it('credits the flat cost back on refund', async () => {
    const service = serviceMock();
    await new CreditGuardAdapter(service, 10).refundGeneration('u1', {
      videoId: 'v1',
      durationSeconds: 30,
    });
    expect(service.credit).toHaveBeenCalledWith('u1', 10, 'refund', 'v1');
  });
});
