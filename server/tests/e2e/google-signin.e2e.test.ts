import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';

import { createApp } from '../../src/app';

const BASE = '/api/v1/auth';
// The stub verifier (active because tests blank GOOGLE_CLIENT_ID) accepts
// tokens of the form stub-google:<sub>:<email>[:unverified].
const stubToken = (sub: string, email: string, unverified = false): string =>
  `stub-google:${sub}:${email}${unverified ? ':unverified' : ''}`;

describe('Google sign-in (e2e)', () => {
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

  it('signs in a new user and the session works', async () => {
    const res = await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-new', 'new-google@reelo.app') });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: expect.any(String), email: 'new-google@reelo.app' });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));

    const me = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('new-google@reelo.app');
  });

  it('returns the same user on repeat sign-in with the same sub', async () => {
    const first = await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-repeat', 'repeat@reelo.app') });
    const second = await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-repeat', 'repeat@reelo.app') });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('auto-links a password account with the same email, keeping password login', async () => {
    const credentials = { email: 'hybrid@reelo.app', password: 'password123' };
    const registered = await request(app).post(`${BASE}/register`).send(credentials);
    expect(registered.status).toBe(201);

    const google = await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-hybrid', credentials.email) });
    expect(google.status).toBe(200);
    expect(google.body.user.id).toBe(registered.body.user.id);

    const passwordLogin = await request(app).post(`${BASE}/login`).send(credentials);
    expect(passwordLogin.status).toBe(200);
  });

  it('rejects password login for a Google-only user with 401', async () => {
    await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-nopass', 'nopass@reelo.app') });

    const login = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'nopass@reelo.app', password: 'whatever-123' });

    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an unverified Google email with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-unv', 'unverified@reelo.app', true) });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/not verified/i);
  });

  it('rejects a garbage token with 401', async () => {
    const res = await request(app).post(`${BASE}/google`).send({ idToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing idToken with 422', async () => {
    const res = await request(app).post(`${BASE}/google`).send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows forgot-password for a Google-only user (adds a password path)', async () => {
    await request(app)
      .post(`${BASE}/google`)
      .send({ idToken: stubToken('sub-forgot', 'google-forgot@reelo.app') });

    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: 'google-forgot@reelo.app' });

    expect(res.status).toBe(202);
  });
});
