import { CreditService } from '@modules/billing/application/credit.service';
import { InsufficientCreditsError } from '@modules/billing/domain/billing.errors';
import type { ICreditAccountStore } from '@modules/billing/domain/ports/credit-account-store';
import type { ILedgerRepository } from '@modules/billing/domain/ports/ledger-repository';
import type { IUnitOfWork } from '@shared/domain/ports/unit-of-work';

function accountsMock() {
  return {
    ensureAccount: jest.fn().mockResolvedValue(undefined),
    getBalance: jest.fn().mockResolvedValue(100),
    tryDebit: jest.fn(),
    credit: jest.fn(),
  } satisfies Record<keyof ICreditAccountStore, jest.Mock>;
}

function ledgerMock() {
  return {
    append: jest.fn().mockResolvedValue(undefined),
    existsByReference: jest.fn().mockResolvedValue(false),
    listByUser: jest.fn(),
  } satisfies Record<keyof ILedgerRepository, jest.Mock>;
}

// Runs the work directly (no real transaction), passing an undefined tx through.
function fakeUow(): IUnitOfWork {
  return { run: (work) => work(undefined) };
}

describe('CreditService', () => {
  it('debits and appends a ledger entry', async () => {
    const accounts = accountsMock();
    accounts.tryDebit.mockResolvedValue({ balanceAfter: 90 });
    const ledger = ledgerMock();

    const balance = await new CreditService(accounts, ledger, fakeUow()).debit(
      'u1',
      10,
      'generation',
      'vid-1',
    );

    expect(balance).toBe(90);
    expect(accounts.ensureAccount).toHaveBeenCalledWith('u1', undefined);
    expect(accounts.tryDebit).toHaveBeenCalledWith('u1', 10, undefined);
    const entry = ledger.append.mock.calls[0][0].toSnapshot();
    expect(entry).toMatchObject({
      type: 'debit',
      amount: 10,
      reason: 'generation',
      balanceAfter: 90,
    });
  });

  it('throws 402 and writes no ledger entry when insufficient', async () => {
    const accounts = accountsMock();
    accounts.tryDebit.mockResolvedValue(null);
    const ledger = ledgerMock();

    await expect(
      new CreditService(accounts, ledger, fakeUow()).debit('u1', 1000, 'generation', 'vid-1'),
    ).rejects.toThrow(InsufficientCreditsError);
    expect(ledger.append).not.toHaveBeenCalled();
  });

  it('rejects a non-positive or non-integer amount', async () => {
    const accounts = accountsMock();
    const ledger = ledgerMock();
    const service = new CreditService(accounts, ledger, fakeUow());

    await expect(service.debit('u1', -5, 'generation', 'vid-1')).rejects.toThrow();
    await expect(service.credit('u1', 0, 'topup', 'pay-1')).rejects.toThrow();
    expect(accounts.tryDebit).not.toHaveBeenCalled();
    expect(accounts.credit).not.toHaveBeenCalled();
  });

  it('credits and appends a ledger entry', async () => {
    const accounts = accountsMock();
    accounts.credit.mockResolvedValue({ balanceAfter: 150 });
    const ledger = ledgerMock();

    const balance = await new CreditService(accounts, ledger, fakeUow()).credit(
      'u1',
      50,
      'topup',
      'pay-1',
    );

    expect(balance).toBe(150);
    const entry = ledger.append.mock.calls[0][0].toSnapshot();
    expect(entry).toMatchObject({ type: 'credit', amount: 50, reason: 'topup', balanceAfter: 150 });
  });

  it('is idempotent: skips a credit already recorded for the reference', async () => {
    const accounts = accountsMock();
    accounts.getBalance.mockResolvedValue(150);
    const ledger = ledgerMock();
    ledger.existsByReference.mockResolvedValue(true);

    const balance = await new CreditService(accounts, ledger, fakeUow()).credit(
      'u1',
      50,
      'refund',
      'vid-1',
    );

    expect(balance).toBe(150);
    expect(accounts.credit).not.toHaveBeenCalled();
    expect(ledger.append).not.toHaveBeenCalled();
  });
});
