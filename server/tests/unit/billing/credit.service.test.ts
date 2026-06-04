import { CreditService } from '@modules/billing/application/credit.service';
import { InsufficientCreditsError } from '@modules/billing/domain/billing.errors';
import type { ICreditAccountStore } from '@modules/billing/domain/ports/credit-account-store';
import type { ILedgerRepository } from '@modules/billing/domain/ports/ledger-repository';

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
    listByUser: jest.fn(),
  } satisfies Record<keyof ILedgerRepository, jest.Mock>;
}

describe('CreditService', () => {
  it('debits and appends a ledger entry', async () => {
    const accounts = accountsMock();
    accounts.tryDebit.mockResolvedValue({ balanceAfter: 90 });
    const ledger = ledgerMock();

    const balance = await new CreditService(accounts, ledger).debit(
      'u1',
      10,
      'generation',
      'vid-1',
    );

    expect(balance).toBe(90);
    expect(accounts.ensureAccount).toHaveBeenCalledWith('u1');
    expect(accounts.tryDebit).toHaveBeenCalledWith('u1', 10);
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
      new CreditService(accounts, ledger).debit('u1', 1000, 'generation', 'vid-1'),
    ).rejects.toThrow(InsufficientCreditsError);
    expect(ledger.append).not.toHaveBeenCalled();
  });

  it('credits and appends a ledger entry', async () => {
    const accounts = accountsMock();
    accounts.credit.mockResolvedValue({ balanceAfter: 150 });
    const ledger = ledgerMock();

    const balance = await new CreditService(accounts, ledger).credit('u1', 50, 'topup', 'pay-1');

    expect(balance).toBe(150);
    const entry = ledger.append.mock.calls[0][0].toSnapshot();
    expect(entry).toMatchObject({ type: 'credit', amount: 50, reason: 'topup', balanceAfter: 150 });
  });
});
