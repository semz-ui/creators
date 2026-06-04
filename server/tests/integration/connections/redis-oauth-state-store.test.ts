import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

import { RedisOAuthStateStore } from '@modules/connections/infrastructure/redis-oauth-state-store';

describe('RedisOAuthStateStore (integration)', () => {
  let client: InstanceType<typeof RedisMock>;
  let store: RedisOAuthStateStore;

  beforeEach(() => {
    client = new RedisMock();
    store = new RedisOAuthStateStore(client as unknown as Redis);
  });

  afterEach(async () => {
    await client.flushall();
    client.disconnect();
  });

  it('issues then consumes state exactly once', async () => {
    await store.issue('state-1', { userId: 'u1', platform: 'facebook' }, 600);

    expect(await store.consume('state-1')).toEqual({ userId: 'u1', platform: 'facebook' });
    // Second consume is null — one-time use.
    expect(await store.consume('state-1')).toBeNull();
  });

  it('returns null for unknown state', async () => {
    expect(await store.consume('nope')).toBeNull();
  });

  it('sets a TTL on issued state', async () => {
    await store.issue('state-2', { userId: 'u1', platform: 'tiktok' }, 600);
    const ttl = await client.ttl('oauth:state:state-2');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(600);
  });
});
