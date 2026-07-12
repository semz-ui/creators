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

  it('finds a user by googleId and misses cleanly', async () => {
    const user = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');
    await repo.save(user);

    expect((await repo.findByGoogleId('sub-1'))?.id).toBe(user.id);
    expect(await repo.findByGoogleId('sub-ghost')).toBeNull();
  });

  it('stores no passwordHash key for a Google-only user and round-trips null', async () => {
    const user = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');
    await repo.save(user);

    const doc = await UserModel.findById(user.id).lean().exec();
    expect(doc).not.toHaveProperty('passwordHash');

    const fetched = await repo.findById(user.id);
    expect(fetched?.passwordHash).toBeNull();
    expect(fetched?.googleId).toBe('sub-1');
  });

  it('links an existing password user to Google and re-fetches both fields', async () => {
    const user = User.register(Email.create('a@b.com'), 'hash');
    await repo.save(user);
    await repo.save(user.withGoogleId('sub-9'));

    const fetched = await repo.findByGoogleId('sub-9');
    expect(fetched?.id).toBe(user.id);
    expect(fetched?.passwordHash).toBe('hash');
  });

  it('persists a password added to a Google-only user', async () => {
    const user = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');
    await repo.save(user);
    await repo.save(user.withNewPassword('new-hash'));

    const fetched = await repo.findById(user.id);
    expect(fetched?.passwordHash).toBe('new-hash');
    expect(fetched?.googleId).toBe('sub-1');
  });

  it('lets multiple users without a googleId coexist (sparse index)', async () => {
    await repo.save(User.register(Email.create('one@b.com'), 'h1'));
    await repo.save(User.register(Email.create('two@b.com'), 'h2'));

    expect(await repo.existsByEmail(Email.create('one@b.com'))).toBe(true);
    expect(await repo.existsByEmail(Email.create('two@b.com'))).toBe(true);
  });

  it('enforces a unique googleId index', async () => {
    await repo.save(User.registerWithGoogle(Email.create('g1@user.com'), 'sub-dupe'));

    await expect(
      UserModel.create({
        _id: 'second-google',
        email: 'g2@user.com',
        googleId: 'sub-dupe',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow(mongoose.mongo.MongoServerError);
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
