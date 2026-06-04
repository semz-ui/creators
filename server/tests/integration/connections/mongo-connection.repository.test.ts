import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { Connection } from '@modules/connections/domain/connection.entity';
import type { OAuthAccount } from '@modules/connections/domain/ports/oauth-provider';
import { AesGcmTokenCipher } from '@modules/connections/infrastructure/aes-gcm-token-cipher';
import { ConnectionModel } from '@modules/connections/infrastructure/connection.model';
import { MongoConnectionRepository } from '@modules/connections/infrastructure/mongo-connection.repository';

const account: OAuthAccount = {
  externalAccountId: 'fb_123',
  displayName: 'My Page',
  accessToken: 'plaintext-access',
  refreshToken: 'plaintext-refresh',
  scopes: ['pages_manage_posts'],
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};

describe('MongoConnectionRepository (integration)', () => {
  let mongod: MongoMemoryServer;
  const cipher = new AesGcmTokenCipher('integration-secret-16-chars-min');
  const repo = new MongoConnectionRepository(cipher);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
    await ConnectionModel.syncIndexes();
  });

  afterEach(async () => {
    await ConnectionModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('saves and reads back, decrypting tokens transparently', async () => {
    const conn = Connection.create({ userId: 'user-1', platform: 'facebook', account });
    await repo.save(conn);

    const found = await repo.findById(conn.id);
    expect(found?.accessToken).toBe('plaintext-access');
    expect(found?.refreshToken).toBe('plaintext-refresh');
  });

  it('persists tokens encrypted (not as plaintext)', async () => {
    const conn = Connection.create({ userId: 'user-1', platform: 'facebook', account });
    await repo.save(conn);

    const raw = await ConnectionModel.findById(conn.id).lean();
    expect(raw?.accessToken).not.toBe('plaintext-access');
    expect(raw?.refreshToken).not.toBe('plaintext-refresh');
  });

  it('finds by user + platform and lists by user', async () => {
    await repo.save(Connection.create({ userId: 'user-1', platform: 'facebook', account }));
    await repo.save(Connection.create({ userId: 'user-1', platform: 'youtube', account }));

    expect(await repo.findByUserAndPlatform('user-1', 'facebook')).not.toBeNull();
    expect(await repo.findByUserAndPlatform('user-1', 'tiktok')).toBeNull();
    expect(await repo.listByUser('user-1')).toHaveLength(2);
  });

  it('enforces one connection per user+platform', async () => {
    await repo.save(Connection.create({ userId: 'user-1', platform: 'facebook', account }));
    await expect(
      ConnectionModel.create({
        _id: 'dup',
        userId: 'user-1',
        platform: 'facebook',
        externalAccountId: 'x',
        displayName: 'x',
        scopes: [],
        status: 'active',
        accessToken: 'enc',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it('deletes a connection', async () => {
    const conn = Connection.create({ userId: 'user-1', platform: 'tiktok', account });
    await repo.save(conn);
    await repo.delete(conn.id);
    expect(await repo.findById(conn.id)).toBeNull();
  });
});
