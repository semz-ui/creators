import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { logger } from '@shared/infrastructure/logging/logger';

import { createApp } from '../../src/app';

const BASE = '/api/v1/auth';
const credentials = { email: 'reset-me@reelo.app', password: 'original-pass-123' };

/**
 * The stub email sender logs `{ to, resetUrl }`; spy on the logger to capture
 * the reset link the way a user would receive it by email.
 */
function lastResetToken(infoSpy: jest.SpyInstance): string {
  const call = infoSpy.mock.calls
    .filter(([obj]) => typeof obj === 'object' && obj !== null && 'resetUrl' in obj)
    .at(-1);
  if (!call) {
    throw new Error('No reset link was logged by the stub email sender');
  }
  const { resetUrl } = call[0] as { resetUrl: string };
  const token = new URL(resetUrl).searchParams.get('token');
  if (!token) {
    throw new Error(`Reset URL is missing the token param: ${resetUrl}`);
  }
  return token;
}

describe('Password reset flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let infoSpy: jest.SpyInstance;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    await UserModel.syncIndexes();
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));

    await request(app).post(`${BASE}/register`).send(credentials);
  });

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('resets the password end-to-end and revokes existing sessions', async () => {
    const login = await request(app).post(`${BASE}/login`).send(credentials);
    expect(login.status).toBe(200);
    const preResetRefreshToken = login.body.refreshToken as string;

    const forgot = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: credentials.email });
    expect(forgot.status).toBe(202);
    expect(forgot.body.message).toMatch(/if an account exists/i);

    const token = lastResetToken(infoSpy);
    const newPassword = 'brand-new-pass-456';
    const reset = await request(app).post(`${BASE}/reset-password`).send({
      token,
      password: newPassword,
    });
    expect(reset.status).toBe(204);

    // Old password no longer works; the new one does.
    const oldLogin = await request(app).post(`${BASE}/login`).send(credentials);
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post(`${BASE}/login`)
      .send({ email: credentials.email, password: newPassword });
    expect(newLogin.status).toBe(200);

    // Sessions issued before the reset are revoked.
    const refresh = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: preResetRefreshToken });
    expect(refresh.status).toBe(401);

    // Restore the original password so the other tests stay independent.
    credentials.password = newPassword;
  });

  it('answers an unknown email with the same generic 202', async () => {
    const known = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: credentials.email });
    const unknown = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: 'nobody@reelo.app' });

    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
  });

  it('rejects a malformed email with 422', async () => {
    const res = await request(app).post(`${BASE}/forgot-password`).send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown reset token with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ token: 'garbage-token', password: 'whatever-pass-123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects reuse of an already-consumed token', async () => {
    await request(app).post(`${BASE}/forgot-password`).send({ email: credentials.email });
    const token = lastResetToken(infoSpy);

    const newPassword = 'another-new-pass-789';
    const first = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ token, password: newPassword });
    expect(first.status).toBe(204);
    credentials.password = newPassword;

    const replay = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ token, password: 'replay-attempt-000' });
    expect(replay.status).toBe(401);
  });

  it('a weak password gets 422 and does not burn the token', async () => {
    await request(app).post(`${BASE}/forgot-password`).send({ email: credentials.email });
    const token = lastResetToken(infoSpy);

    const weak = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ token, password: 'short' });
    expect(weak.status).toBe(422);

    const newPassword = 'finally-valid-pass-1';
    const retry = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ token, password: newPassword });
    expect(retry.status).toBe(204);
    credentials.password = newPassword;
  });
});
