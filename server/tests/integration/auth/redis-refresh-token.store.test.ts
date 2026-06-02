import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

import { RedisRefreshTokenStore } from '@modules/auth/infrastructure/redis-refresh-token.store';

const TTL = 3600;

describe('RedisRefreshTokenStore (integration)', () => {
  let client: InstanceType<typeof RedisMock>;
  let store: RedisRefreshTokenStore;

  beforeEach(() => {
    client = new RedisMock();
    store = new RedisRefreshTokenStore(client as unknown as Redis, TTL);
  });

  afterEach(async () => {
    await client.flushall();
    client.disconnect();
  });

  it('saves a token that then reports as existing', async () => {
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j1' });

    expect(await store.exists('j1')).toBe(true);
    expect(await store.exists('unknown')).toBe(false);
  });

  it('sets a TTL on the saved token', async () => {
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j1' });

    const ttl = await client.ttl('auth:rt:j1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(TTL);
  });

  it('remove deletes a single token', async () => {
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j1' });
    await store.remove({ familyId: 'f1', jti: 'j1' });

    expect(await store.exists('j1')).toBe(false);
  });

  it('revokeFamily removes every token in the family', async () => {
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j1' });
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j2' });

    await store.revokeFamily('f1');

    expect(await store.exists('j1')).toBe(false);
    expect(await store.exists('j2')).toBe(false);
  });

  it('revokeUser removes tokens across all the user families', async () => {
    await store.save({ userId: 'u1', familyId: 'f1', jti: 'j1' });
    await store.save({ userId: 'u1', familyId: 'f2', jti: 'j2' });

    await store.revokeUser('u1');

    expect(await store.exists('j1')).toBe(false);
    expect(await store.exists('j2')).toBe(false);
  });
});
