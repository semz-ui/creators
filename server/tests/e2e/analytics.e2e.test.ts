import type { Express } from 'express';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { buildContainer } from '@container/index';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { VideoModel } from '@modules/video/infrastructure/video.model';

import { createApp } from '../../src/app';

const GENERATION_SECRET = 'dev-generation-callback-secret-change-me';

describe('Analytics flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let app: Express;
  let token: string;

  const bearer = () => ({ Authorization: `Bearer ${token}` });

  async function createReadyVideo(): Promise<string> {
    const created = await request(app)
      .post('/api/v1/videos')
      .set(bearer())
      .send({ prompt: 'a sunset', durationSeconds: 10 });
    const id = created.body.data.id as string;
    const doc = await VideoModel.findById(id).lean();
    await request(app)
      .post('/api/v1/videos/callbacks/generation')
      .set('x-generation-secret', GENERATION_SECRET)
      .send({ jobRef: doc?.jobRef, status: 'ready', resultUrl: 'https://cdn.reelo.app/v.mp4' });
    return id;
  }

  async function connect(platform: string): Promise<void> {
    const start = await request(app).post(`/api/v1/connections/${platform}/start`).set(bearer());
    const state = new URL(start.body.data.authorizationUrl).searchParams.get('state');
    await request(app).get('/api/v1/connections/callback').query({ state, code: 'c' });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    redisClient = new RedisMock();
    app = createApp(buildContainer({ redisClient: redisClient as unknown as Redis }));
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'analytics@reelo.app', password: 'password123' });
    token = reg.body.data.accessToken;
  });

  afterAll(async () => {
    await Promise.all([UserModel.deleteMany({}), VideoModel.deleteMany({})]);
    await disconnectMongo();
    await mongod.stop();
    redisClient.disconnect();
  });

  it('refreshes, then reports overview and per-video analytics across platforms', async () => {
    await connect('facebook');
    await connect('youtube');
    const videoId = await createReadyVideo();

    const published = await request(app)
      .post('/api/v1/publications')
      .set(bearer())
      .send({ videoId, platforms: ['facebook', 'youtube'] });
    expect(published.body.data.status).toBe('completed');

    // Empty before a refresh.
    const before = await request(app).get('/api/v1/analytics/overview').set(bearer());
    expect(before.body.data.videoCount).toBe(0);

    const refresh = await request(app).post('/api/v1/analytics/refresh').set(bearer());
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.synced).toBe(2);

    const overview = await request(app).get('/api/v1/analytics/overview').set(bearer());
    expect(overview.status).toBe(200);
    expect(overview.body.data.videoCount).toBe(1);
    expect(
      overview.body.data.byPlatform.map((p: { platform: string }) => p.platform).sort(),
    ).toEqual(['facebook', 'youtube']);
    // totals == sum of the two platforms' views
    const sumViews = overview.body.data.byPlatform.reduce(
      (acc: number, p: { metrics: { views: number } }) => acc + p.metrics.views,
      0,
    );
    expect(overview.body.data.totals.views).toBe(sumViews);

    const perVideo = await request(app).get(`/api/v1/analytics/videos/${videoId}`).set(bearer());
    expect(perVideo.status).toBe(200);
    expect(perVideo.body.data.byPlatform).toHaveLength(2);
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/analytics/overview')).status).toBe(401);
  });

  it('returns empty analytics for a video with no published posts', async () => {
    const res = await request(app).get('/api/v1/analytics/videos/unknown-video').set(bearer());
    expect(res.status).toBe(200);
    expect(res.body.data.byPlatform).toEqual([]);
    expect(res.body.data.totals).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 });
  });
});
