import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { VideoModel } from '@modules/video/infrastructure/video.model';

import { createApp } from '../../src/app';

const CALLBACK_SECRET = 'dev-generation-callback-secret-change-me';

async function registerUser(app: Express, email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password123' });
  return res.body.data.accessToken as string;
}

describe('Video flow (e2e)', () => {
  // Generation debits/refunds run in Mongo transactions, which require a replica set.
  let mongod: MongoMemoryReplSet;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectMongo(mongod.getUri());
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    tokenA = await registerUser(app, 'a@reelo.app');
    tokenB = await registerUser(app, 'b@reelo.app');
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await VideoModel.deleteMany({});
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('requires authentication to create a video', async () => {
    const res = await request(app)
      .post('/api/v1/videos')
      .send({ prompt: 'a cat', durationSeconds: 10 });
    expect(res.status).toBe(401);
  });

  it('validates the create payload', async () => {
    const res = await request(app)
      .post('/api/v1/videos')
      .set(auth(tokenA))
      .send({ prompt: '', durationSeconds: 999 });
    expect(res.status).toBe(422);
  });

  it('lists the selectable providers with their availability', async () => {
    const res = await request(app).get('/api/v1/videos/providers').set(auth(tokenA));

    expect(res.status).toBe(200);
    // The test env configures no credentials, so every real provider is red.
    expect(res.body.data.providers).toEqual([
      { id: 'sora', label: 'Sora', available: false, supportsAudio: true },
      { id: 'kling', label: 'Kling', available: false, supportsAudio: false },
      { id: 'pika', label: 'Pika', available: false, supportsAudio: false },
    ]);
  });

  it('rejects an unconfigured provider without spending credits', async () => {
    const before = await request(app).get('/api/v1/billing/balance').set(auth(tokenA));

    const res = await request(app)
      .post('/api/v1/videos')
      .set(auth(tokenA))
      .send({ prompt: 'a cat', durationSeconds: 10, provider: 'pika' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not configured/);

    const after = await request(app).get('/api/v1/billing/balance').set(auth(tokenA));
    expect(after.body.data.balance).toBe(before.body.data.balance);
  });

  it('runs the full create → callback → ready lifecycle', async () => {
    // Create — starts processing.
    const created = await request(app)
      .post('/api/v1/videos')
      .set(auth(tokenA))
      .send({ prompt: 'a neon city at night', durationSeconds: 15 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'processing', durationSeconds: 15 });
    const id = created.body.data.id as string;

    // Owner can read it; another user cannot.
    expect((await request(app).get(`/api/v1/videos/${id}`).set(auth(tokenA))).status).toBe(200);
    expect((await request(app).get(`/api/v1/videos/${id}`).set(auth(tokenB))).status).toBe(404);

    // It appears in the owner's list.
    const list = await request(app).get('/api/v1/videos').set(auth(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
    expect(list.body.data.items.some((v: { id: string }) => v.id === id)).toBe(true);

    // The provider posts the result (we read the jobRef as the provider would know it).
    const doc = await VideoModel.findById(id).lean();
    const jobRef = doc?.jobRef as string;

    const badSecret = await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', 'wrong')
      .send({ jobRef, status: 'ready', resultUrl: 'https://cdn.reelo.app/v.mp4' });
    expect(badSecret.status).toBe(401);

    const callback = await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', CALLBACK_SECRET)
      .send({ jobRef, status: 'ready', resultUrl: 'https://cdn.reelo.app/v.mp4' });
    expect(callback.status).toBe(204);

    // Now ready with the result URL.
    const ready = await request(app).get(`/api/v1/videos/${id}`).set(auth(tokenA));
    expect(ready.body.data).toMatchObject({
      status: 'ready',
      resultUrl: 'https://cdn.reelo.app/v.mp4',
    });
  });

  it('callback with an unknown jobRef is a no-op (204)', async () => {
    const res = await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', CALLBACK_SECRET)
      .send({ jobRef: 'does-not-exist', status: 'ready', resultUrl: 'https://cdn/x.mp4' });
    expect(res.status).toBe(204);
  });
});
