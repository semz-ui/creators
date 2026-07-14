import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { ConnectionModel } from '@modules/connections/infrastructure/connection.model';

import { createApp } from '../../src/app';

const BASE = '/api/v1/connections';

function stateFromUrl(url: string): string {
  return new URL(url).searchParams.get('state') ?? '';
}

describe('Connections flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let token: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    await ConnectionModel.syncIndexes();
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'c@reelo.app', password: 'password123' });
    token = reg.body.data.accessToken;
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ConnectionModel.deleteMany({});
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  const auth = {
    get headers() {
      return { Authorization: `Bearer ${token}` };
    },
  };

  function startAndComplete(platform: string) {
    return request(app)
      .post(`${BASE}/${platform}/start`)
      .set(auth.headers)
      .then((start) =>
        request(app)
          .get(`${BASE}/callback`)
          .query({ state: stateFromUrl(start.body.data.authorizationUrl), code: 'auth-code' }),
      );
  }

  it('requires auth to start a connection', async () => {
    expect((await request(app).post(`${BASE}/facebook/start`)).status).toBe(401);
  });

  it('rejects an unsupported platform', async () => {
    const res = await request(app).post(`${BASE}/myspace/start`).set(auth.headers);
    expect(res.status).toBe(422);
  });

  it('links an account through the OAuth round-trip', async () => {
    const start = await request(app).post(`${BASE}/facebook/start`).set(auth.headers);
    expect(start.status).toBe(200);
    expect(start.body.data.authorizationUrl).toContain('state=');

    const callback = await request(app)
      .get(`${BASE}/callback`)
      .query({ state: stateFromUrl(start.body.data.authorizationUrl), code: 'auth-code' });
    expect(callback.status).toBe(200);
    expect(callback.body.data).toMatchObject({ platform: 'facebook', status: 'active' });
    expect(callback.body.data).not.toHaveProperty('accessToken');

    const list = await request(app).get(BASE).set(auth.headers);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0]).not.toHaveProperty('accessToken');
  });

  it('reuses (reconnects) rather than duplicating the same platform', async () => {
    await startAndComplete('youtube');
    const first = await request(app).get(BASE).set(auth.headers);
    const youtube = first.body.data.items.find(
      (c: { platform: string }) => c.platform === 'youtube',
    );

    await startAndComplete('youtube');
    const second = await request(app).get(BASE).set(auth.headers);
    const youtubeAgain = second.body.data.items.filter(
      (c: { platform: string }) => c.platform === 'youtube',
    );

    expect(youtubeAgain).toHaveLength(1);
    expect(youtubeAgain[0].id).toBe(youtube.id);
  });

  it('rejects a callback with an invalid state', async () => {
    const res = await request(app).get(`${BASE}/callback`).query({ state: 'bogus', code: 'x' });
    expect(res.status).toBe(401);
  });

  it('disconnects a connection', async () => {
    const callback = await startAndComplete('tiktok');
    const id = callback.body.data.id as string;

    expect((await request(app).delete(`${BASE}/${id}`).set(auth.headers)).status).toBe(204);

    const list = await request(app).get(BASE).set(auth.headers);
    expect(list.body.data.items.some((c: { id: string }) => c.id === id)).toBe(false);
  });
});
