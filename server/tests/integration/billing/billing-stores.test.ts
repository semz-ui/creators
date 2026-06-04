import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { LedgerEntry } from '@modules/billing/domain/ledger-entry.entity';
import { Payment } from '@modules/billing/domain/payment.entity';
import { CreditAccountModel } from '@modules/billing/infrastructure/credit-account.model';
import { LedgerEntryModel } from '@modules/billing/infrastructure/ledger-entry.model';
import { PaymentModel } from '@modules/billing/infrastructure/payment.model';
import { MongoCreditAccountStore } from '@modules/billing/infrastructure/mongo-credit-account.store';
import { MongoLedgerRepository } from '@modules/billing/infrastructure/mongo-ledger.repository';
import { MongoPaymentRepository } from '@modules/billing/infrastructure/mongo-payment.repository';

describe('Billing stores (integration)', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterEach(async () => {
    await Promise.all([
      CreditAccountModel.deleteMany({}),
      LedgerEntryModel.deleteMany({}),
      PaymentModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  describe('MongoCreditAccountStore', () => {
    const store = new MongoCreditAccountStore(100);

    it('seeds the initial free grant on first ensure', async () => {
      await store.ensureAccount('u1');
      expect(await store.getBalance('u1')).toBe(100);
    });

    it('debits atomically and refuses to overdraw', async () => {
      await store.ensureAccount('u1');

      const ok = await store.tryDebit('u1', 30);
      expect(ok).toEqual({ balanceAfter: 70 });

      const tooMuch = await store.tryDebit('u1', 1000);
      expect(tooMuch).toBeNull();
      expect(await store.getBalance('u1')).toBe(70);
    });

    it('credits via upsert', async () => {
      await store.ensureAccount('u1');
      const result = await store.credit('u1', 25);
      expect(result.balanceAfter).toBe(125);
    });
  });

  it('MongoLedgerRepository appends and lists newest-first with a total', async () => {
    const repo = new MongoLedgerRepository();
    for (let i = 0; i < 3; i++) {
      await repo.append(
        LedgerEntry.record({
          userId: 'u1',
          type: 'debit',
          amount: 10,
          reason: 'generation',
          referenceId: `v-${i}`,
          balanceAfter: 90 - i * 10,
        }),
      );
    }
    await repo.append(
      LedgerEntry.record({
        userId: 'other',
        type: 'credit',
        amount: 5,
        reason: 'topup',
        referenceId: null,
        balanceAfter: 5,
      }),
    );

    const page = await repo.listByUser('u1', { limit: 2, skip: 0 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
  });

  it('MongoPaymentRepository finds by id and provider ref', async () => {
    const repo = new MongoPaymentRepository();
    const payment = Payment.create({ userId: 'u1', credits: 50 });
    payment.attachProviderRef('pay_xyz');
    await repo.save(payment);

    expect((await repo.findById(payment.id))?.credits).toBe(50);
    expect((await repo.findByProviderRef('pay_xyz'))?.id).toBe(payment.id);
    expect(await repo.findByProviderRef('missing')).toBeNull();
  });
});
