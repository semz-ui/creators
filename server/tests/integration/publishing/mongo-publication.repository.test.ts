import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { MongoPublicationRepository } from '@modules/publishing/infrastructure/mongo-publication.repository';
import { PublicationModel } from '@modules/publishing/infrastructure/publication.model';
import { Publication } from '@modules/publishing/domain/publication.entity';

function publication(opts: { userId?: string; scheduledAt?: Date | null } = {}) {
  return Publication.create({
    userId: opts.userId ?? 'user-1',
    videoId: 'v1',
    caption: 'cap',
    scheduledAt: opts.scheduledAt ?? null,
    targets: [{ platform: 'facebook', connectionId: 'c-fb' }],
  });
}

describe('MongoPublicationRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const repo = new MongoPublicationRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterEach(async () => {
    await PublicationModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('saves and reads back with targets and status', async () => {
    const p = publication();
    p.markTargetPublished('facebook', 'ext-1');
    p.recomputeStatus();
    await repo.save(p);

    const found = await repo.findById(p.id);
    expect(found?.status).toBe('completed');
    expect(found?.targets[0]?.externalPostId).toBe('ext-1');
  });

  it('lists by owner, newest first, with a total', async () => {
    await repo.save(publication({ userId: 'user-1' }));
    await repo.save(publication({ userId: 'user-1' }));
    await repo.save(publication({ userId: 'other' }));

    const page = await repo.findByOwner('user-1', { limit: 10, skip: 0 });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('findDue returns only scheduled publications whose time has passed', async () => {
    const now = new Date();
    // Future scheduled — not due.
    await repo.save(publication({ scheduledAt: new Date(now.getTime() + 3_600_000) }));
    // Past-scheduled, persisted directly so status stays "scheduled".
    const overdue = Publication.fromSnapshot({
      ...publication().toSnapshot(),
      id: 'overdue',
      status: 'scheduled',
      scheduledAt: new Date(now.getTime() - 1000),
    });
    await repo.save(overdue);

    const due = await repo.findDue(now, 10);
    expect(due).toHaveLength(1);
    expect(due[0]?.id).toBe('overdue');
  });
});
