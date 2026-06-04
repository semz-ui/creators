import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { Metrics } from '@modules/analytics/domain/metrics';
import { VideoMetric } from '@modules/analytics/domain/video-metric.entity';
import { MongoVideoMetricRepository } from '@modules/analytics/infrastructure/mongo-video-metric.repository';
import { VideoMetricModel } from '@modules/analytics/infrastructure/video-metric.model';

function metric(videoId: string, platform: 'facebook' | 'youtube', value: number) {
  return VideoMetric.create({
    userId: 'u1',
    videoId,
    platform,
    externalPostId: `${platform}-post`,
    metrics: Metrics.of({ views: value, likes: value, comments: value, shares: value }),
  });
}

describe('MongoVideoMetricRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const repo = new MongoVideoMetricRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterEach(async () => {
    await VideoMetricModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('upsert is latest-wins for the same (user, video, platform)', async () => {
    await repo.upsert(metric('v1', 'facebook', 10));
    await repo.upsert(metric('v1', 'facebook', 99));

    const rows = await repo.listByUserAndVideo('u1', 'v1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.metrics.views).toBe(99);
  });

  it('lists by user and by user+video', async () => {
    await repo.upsert(metric('v1', 'facebook', 10));
    await repo.upsert(metric('v1', 'youtube', 20));
    await repo.upsert(metric('v2', 'facebook', 5));

    expect(await repo.listByUser('u1')).toHaveLength(3);
    expect(await repo.listByUserAndVideo('u1', 'v1')).toHaveLength(2);
  });
});
