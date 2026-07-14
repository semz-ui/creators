import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';

import { createApp } from '../../src/app';

const BASE = '/api/v1/auth';
const credentials = { email: 'creator@reelo.app', password: 'password123' };

describe('Auth flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    await UserModel.syncIndexes();
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post(`${BASE}/register`).send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual({ id: expect.any(String), email: credentials.email });
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects duplicate registration with 409', async () => {
    const res = await request(app).post(`${BASE}/register`).send(credentials);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak passwords with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'x@y.com', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with valid credentials and rejects bad ones', async () => {
    const ok = await request(app).post(`${BASE}/login`).send(credentials);
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));

    const bad = await request(app)
      .post(`${BASE}/login`)
      .send({ ...credentials, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /me requires a valid bearer token', async () => {
    const login = await request(app).post(`${BASE}/login`).send(credentials);
    const { accessToken } = login.body.data;

    const authed = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(authed.status).toBe(200);
    expect(authed.body.data.email).toBe(credentials.email);

    const anon = await request(app).get(`${BASE}/me`);
    expect(anon.status).toBe(401);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const login = await request(app).post(`${BASE}/login`).send(credentials);
    const original = login.body.data.refreshToken as string;

    // First rotation succeeds and yields a new refresh token.
    const rotated = await request(app).post(`${BASE}/refresh`).send({ refreshToken: original });
    expect(rotated.status).toBe(200);
    const next = rotated.body.data.refreshToken as string;
    expect(next).not.toBe(original);

    // Reusing the original (already-rotated) token is rejected...
    const reused = await request(app).post(`${BASE}/refresh`).send({ refreshToken: original });
    expect(reused.status).toBe(401);

    // ...and reuse detection revokes the whole family, killing the new token too.
    const afterRevoke = await request(app).post(`${BASE}/refresh`).send({ refreshToken: next });
    expect(afterRevoke.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const login = await request(app).post(`${BASE}/login`).send(credentials);
    const refreshToken = login.body.data.refreshToken as string;

    const out = await request(app).post(`${BASE}/logout`).send({ refreshToken });
    expect(out.status).toBe(204);

    const reuse = await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    expect(reuse.status).toBe(401);
  });
});
