import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { RedisCacheService } from '@shared/infrastructure/cache/cache-service';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { CachedUserRepository } from '@modules/auth/infrastructure/cached-user.repository';
import { MongoUserRepository } from '@modules/auth/infrastructure/mongo-user.repository';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

const TTL = 300;

describe('CachedUserRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  let redisClient: InstanceType<typeof RedisMock>;
  let repo: CachedUserRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  beforeEach(() => {
    redisClient = new RedisMock();
    repo = new CachedUserRepository(
      new MongoUserRepository(),
      new RedisCacheService(redisClient as unknown as Redis),
      TTL,
    );
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
    await redisClient.flushall();
    redisClient.disconnect();
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('serves a second read from cache even after the DB row changes', async () => {
    const user = User.register(Email.create('a@b.com'), 'original-hash');
    await repo.save(user);

    // First read populates the cache from the DB.
    const first = await repo.findById(user.id);
    expect(first?.passwordHash).toBe('original-hash');

    // Mutate the underlying document directly, bypassing the repository.
    await UserModel.updateOne({ _id: user.id }, { $set: { passwordHash: 'changed-hash' } });

    // Second read is served from cache — still the original value.
    const cached = await repo.findById(user.id);
    expect(cached?.passwordHash).toBe('original-hash');
  });

  it('save invalidates the cache so the next read is fresh', async () => {
    const user = User.register(Email.create('a@b.com'), 'original-hash');
    await repo.save(user);
    await repo.findById(user.id); // populate cache

    // Persist a new hash through the repository (write-through + invalidation).
    const updated = User.fromSnapshot({ ...user.toSnapshot(), passwordHash: 'fresh-hash' });
    await repo.save(updated);

    const result = await repo.findById(user.id);
    expect(result?.passwordHash).toBe('fresh-hash');
  });

  it('caches under the namespaced key', async () => {
    const user = User.register(Email.create('a@b.com'), 'hash');
    await repo.save(user);
    await repo.findById(user.id);

    expect(await redisClient.exists(`user:${user.id}`)).toBe(1);
  });
});
