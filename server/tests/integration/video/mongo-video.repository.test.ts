import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { MongoVideoRepository } from '@modules/video/infrastructure/mongo-video.repository';
import { VideoModel } from '@modules/video/infrastructure/video.model';
import { Video } from '@modules/video/domain/video.entity';
import { Duration } from '@modules/video/domain/value-objects/duration';
import { Prompt } from '@modules/video/domain/value-objects/prompt';

function makeVideo(ownerId: string, jobRef = 'job-1') {
  const v = Video.create({
    ownerId,
    prompt: Prompt.create('a cat'),
    duration: Duration.create(10),
  });
  v.markProcessing(jobRef);
  return v;
}

describe('MongoVideoRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const repo = new MongoVideoRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterEach(async () => {
    await VideoModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('saves and finds by id (with status updates persisting)', async () => {
    const v = makeVideo('user-1');
    await repo.save(v);
    v.markReady('https://cdn/v.mp4');
    await repo.save(v);

    const found = await repo.findById(v.id);
    expect(found?.status).toBe('ready');
    expect(found?.resultUrl).toBe('https://cdn/v.mp4');
    expect(found?.createdAt).toBeInstanceOf(Date);
  });

  it('finds by jobRef', async () => {
    const v = makeVideo('user-1', 'job-abc');
    await repo.save(v);

    const found = await repo.findByJobRef('job-abc');
    expect(found?.id).toBe(v.id);
    expect(await repo.findByJobRef('missing')).toBeNull();
  });

  it('claimTerminal flips a processing job once and reports the winner', async () => {
    const v = makeVideo('user-1', 'job-claim');
    await repo.save(v);

    const won = await repo.claimTerminal('job-claim', { status: 'failed', error: 'boom' });
    expect(won?.status).toBe('failed');
    expect(won?.error).toBe('boom');

    // A second claim on the now-terminal job finds nothing to flip -> null.
    const lost = await repo.claimTerminal('job-claim', {
      status: 'ready',
      resultUrl: 'https://cdn/late.mp4',
    });
    expect(lost).toBeNull();

    const found = await repo.findByJobRef('job-claim');
    expect(found?.status).toBe('failed'); // unchanged by the lost claim
  });

  it('claimTerminal is a no-op (null) for an unknown jobRef', async () => {
    expect(await repo.claimTerminal('nope', { status: 'ready', resultUrl: 'u' })).toBeNull();
  });

  it('claimTerminal admits only one of two concurrent claims', async () => {
    const v = makeVideo('user-1', 'job-race');
    await repo.save(v);

    const [a, b] = await Promise.all([
      repo.claimTerminal('job-race', { status: 'failed', error: 'a' }),
      repo.claimTerminal('job-race', { status: 'failed', error: 'b' }),
    ]);

    // Exactly one wins (non-null); the other loses (null).
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('lists an owner page newest-first with a total', async () => {
    for (let i = 0; i < 3; i++) {
      await repo.save(makeVideo('user-1', `job-${i}`));
    }
    await repo.save(makeVideo('other-user', 'job-x'));

    const page = await repo.findByOwner('user-1', { limit: 2, skip: 0 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
    expect(page.items.every((v) => v.ownerId === 'user-1')).toBe(true);
    // newest first (sorted by createdAt desc)
    expect(page.items[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
      page.items[1]!.createdAt.getTime(),
    );
  });
});
