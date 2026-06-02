import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { MongoUserRepository } from '@modules/auth/infrastructure/mongo-user.repository';
import { UserModel } from '@modules/auth/infrastructure/user.model';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

describe('MongoUserRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const repo = new MongoUserRepository();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    await UserModel.syncIndexes();
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('saves and finds a user by id and email', async () => {
    const user = User.register(Email.create('a@b.com'), 'hash');
    await repo.save(user);

    const byId = await repo.findById(user.id);
    const byEmail = await repo.findByEmail(Email.create('a@b.com'));

    expect(byId?.email).toBe('a@b.com');
    expect(byEmail?.id).toBe(user.id);
    expect(byId?.passwordHash).toBe('hash');
  });

  it('returns null when not found', async () => {
    expect(await repo.findById('missing')).toBeNull();
    expect(await repo.findByEmail(Email.create('missing@b.com'))).toBeNull();
  });

  it('reports existence by email', async () => {
    await repo.save(User.register(Email.create('a@b.com'), 'hash'));

    expect(await repo.existsByEmail(Email.create('a@b.com'))).toBe(true);
    expect(await repo.existsByEmail(Email.create('other@b.com'))).toBe(false);
  });

  it('enforces a unique email index', async () => {
    await repo.save(User.register(Email.create('dupe@b.com'), 'h1'));

    await expect(
      UserModel.create({
        _id: 'second',
        email: 'dupe@b.com',
        passwordHash: 'h2',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow(mongoose.mongo.MongoServerError);
  });
});
