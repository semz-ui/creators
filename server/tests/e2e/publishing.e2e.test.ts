import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { ConnectionModel } from '@modules/connections/infrastructure/connection.model';
import { VideoModel } from '@modules/video/infrastructure/video.model';
import { PublicationModel } from '@modules/publishing/infrastructure/publication.model';

import { createApp } from '../../src/app';

const GENERATION_SECRET = 'dev-generation-callback-secret-change-me';
const SCHEDULER_SECRET = 'dev-publish-scheduler-secret-change-me';

describe('Publishing flow (e2e)', () => {
  // Creating a video debits credits in a Mongo transaction, which needs a replica set.
  let mongod: MongoMemoryReplSet;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let token: string;

  const bearer = () => ({ Authorization: `Bearer ${token}` });

  async function registerUser(email: string): Promise<string> {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123' });
    return res.body.accessToken as string;
  }

  async function createReadyVideo(): Promise<string> {
    const created = await request(app)
      .post('/api/v1/videos')
      .set(bearer())
      .send({ prompt: 'a sunset', durationSeconds: 10 });
    const id = created.body.id as string;
    const doc = await VideoModel.findById(id).lean();
    await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', GENERATION_SECRET)
      .send({ jobRef: doc?.jobRef, status: 'ready', resultUrl: 'https://cdn.reelo.app/v.mp4' });
    return id;
  }

  async function connect(platform: string): Promise<void> {
    const start = await request(app).post(`/api/v1/connections/${platform}/start`).set(bearer());
    const state = new URL(start.body.authorizationUrl).searchParams.get('state');
    await request(app).get('/api/v1/connections/callback').query({ state, code: 'c' });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectMongo(mongod.getUri());
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    token = await registerUser('pub@reelo.app');
    await connect('facebook');
  });

  afterAll(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      ConnectionModel.deleteMany({}),
      VideoModel.deleteMany({}),
      PublicationModel.deleteMany({}),
    ]);
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('publishes a ready video to a connected platform immediately', async () => {
    const videoId = await createReadyVideo();

    const res = await request(app)
      .post('/api/v1/publications')
      .set(bearer())
      .send({ videoId, platforms: ['facebook'], caption: 'check this out' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completed');
    expect(res.body.targets).toHaveLength(1);
    expect(res.body.targets[0]).toMatchObject({ platform: 'facebook', status: 'published' });
    expect(res.body.targets[0].externalPostId).toEqual(expect.any(String));

    // Visible to the owner; not to others.
    const id = res.body.id as string;
    expect((await request(app).get(`/api/v1/publications/${id}`).set(bearer())).status).toBe(200);
    const otherToken = await registerUser('intruder@reelo.app');
    expect(
      (
        await request(app)
          .get(`/api/v1/publications/${id}`)
          .set({ Authorization: `Bearer ${otherToken}` })
      ).status,
    ).toBe(404);
  });

  it('rejects publishing to a platform with no connection', async () => {
    const videoId = await createReadyVideo();
    const res = await request(app)
      .post('/api/v1/publications')
      .set(bearer())
      .send({ videoId, platforms: ['instagram'] });
    expect(res.status).toBe(422);
  });

  it('rejects publishing a video that is not ready', async () => {
    const created = await request(app)
      .post('/api/v1/videos')
      .set(bearer())
      .send({ prompt: 'still cooking', durationSeconds: 10 });
    const res = await request(app)
      .post('/api/v1/publications')
      .set(bearer())
      .send({ videoId: created.body.id, platforms: ['facebook'] });
    expect(res.status).toBe(422);
  });

  it('stores a future-scheduled publication and processes due ones via the scheduler', async () => {
    const videoId = await createReadyVideo();
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();

    const scheduled = await request(app)
      .post('/api/v1/publications')
      .set(bearer())
      .send({ videoId, platforms: ['facebook'], scheduledAt });
    expect(scheduled.status).toBe(201);
    expect(scheduled.body.status).toBe('scheduled');

    // Bad secret rejected.
    expect((await request(app).post('/api/v1/publications/process-due')).status).toBe(401);

    // Good secret runs the scheduler. The only publication is scheduled for the
    // future, so nothing is due yet → exactly 0 processed.
    const run = await request(app)
      .post('/api/v1/publications/process-due')
      .set('x-scheduler-secret', SCHEDULER_SECRET);
    expect(run.status).toBe(200);
    expect(run.body).toMatchObject({ processed: 0 });
  });
});
