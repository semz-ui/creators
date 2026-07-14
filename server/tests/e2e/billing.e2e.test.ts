import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { VideoModel } from '@modules/video/infrastructure/video.model';
import { PaymentModel } from '@modules/billing/infrastructure/payment.model';

import { createApp } from '../../src/app';

const GENERATION_SECRET = 'dev-generation-callback-secret-change-me';
const PAYMENT_SECRET = 'dev-payment-webhook-secret-change-me';
// Matches env defaults.
const INITIAL = 100;
const COST = 10;

describe('Billing flow (e2e)', () => {
  // Credit movements run in Mongo transactions, which require a replica set.
  let mongod: MongoMemoryReplSet;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let token: string;

  const bearer = () => ({ Authorization: `Bearer ${token}` });
  const balance = async (): Promise<number> =>
    (await request(app).get('/api/v1/billing/balance').set(bearer())).body.data.balance;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectMongo(mongod.getUri());
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'billing@reelo.app', password: 'password123' });
    token = reg.body.data.accessToken;
  });

  afterAll(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      VideoModel.deleteMany({}),
      PaymentModel.deleteMany({}),
    ]);
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('grants initial free credits to a new account', async () => {
    expect(await balance()).toBe(INITIAL);
  });

  it('debits on generation and refunds when generation fails', async () => {
    const created = await request(app)
      .post('/api/v1/videos')
      .set(bearer())
      .send({ prompt: 'a cat', durationSeconds: 10 });
    expect(created.status).toBe(201);
    expect(await balance()).toBe(INITIAL - COST);

    // Provider reports failure → credits refunded.
    const doc = await VideoModel.findById(created.body.data.id).lean();
    await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', GENERATION_SECRET)
      .send({ jobRef: doc?.jobRef, status: 'failed', error: 'gpu exploded' });

    expect(await balance()).toBe(INITIAL);
  });

  it('tops up via checkout + webhook (idempotently)', async () => {
    const before = await balance();

    const topup = await request(app)
      .post('/api/v1/billing/topup')
      .set(bearer())
      .send({ credits: 50 });
    expect(topup.status).toBe(201);
    expect(topup.body.data.checkoutUrl).toEqual(expect.any(String));

    const payment = await PaymentModel.findById(topup.body.data.paymentId).lean();
    const providerRef = payment?.providerRef;

    // Bad secret rejected.
    expect(
      (
        await request(app)
          .post('/api/v1/billing/webhooks/payment')
          .send({ providerRef, status: 'completed' })
      ).status,
    ).toBe(401);

    const ok = await request(app)
      .post('/api/v1/billing/webhooks/payment')
      .set('x-payment-secret', PAYMENT_SECRET)
      .send({ providerRef, status: 'completed' });
    expect(ok.status).toBe(204);
    expect(await balance()).toBe(before + 50);

    // Duplicate webhook is accepted (204) but does not double-credit.
    const dup = await request(app)
      .post('/api/v1/billing/webhooks/payment')
      .set('x-payment-secret', PAYMENT_SECRET)
      .send({ providerRef, status: 'completed' });
    expect(dup.status).toBe(204);
    expect(await balance()).toBe(before + 50);
  });

  it('lists ledger entries for the recorded movements', async () => {
    const res = await request(app).get('/api/v1/billing/ledger').set(bearer());
    expect(res.status).toBe(200);
    const reasons = res.body.data.items.map((e: { reason: string }) => e.reason);
    expect(reasons).toEqual(expect.arrayContaining(['generation', 'refund', 'topup']));
  });

  it('blocks generation when out of credits (402)', async () => {
    const broke = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'broke@reelo.app', password: 'password123' });
    const brokeToken = broke.body.data.accessToken as string;

    // Drain the initial grant (INITIAL / COST generations), then the next is blocked.
    for (let i = 0; i < INITIAL / COST; i++) {
      const r = await request(app)
        .post('/api/v1/videos')
        .set({ Authorization: `Bearer ${brokeToken}` })
        .send({ prompt: `v${i}`, durationSeconds: 10 });
      expect(r.status).toBe(201);
    }

    const blocked = await request(app)
      .post('/api/v1/videos')
      .set({ Authorization: `Bearer ${brokeToken}` })
      .send({ prompt: 'one too many', durationSeconds: 10 });
    expect(blocked.status).toBe(402);
    expect(blocked.body.error.code).toBe('INSUFFICIENT_CREDITS');
  });
});
