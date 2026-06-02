import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

import { RedisCacheService } from '@shared/infrastructure/cache/cache-service';

describe('RedisCacheService against a Redis backend (integration)', () => {
  let client: InstanceType<typeof RedisMock>;
  let cache: RedisCacheService;

  beforeEach(() => {
    client = new RedisMock();
    cache = new RedisCacheService(client as unknown as Redis);
  });

  afterEach(async () => {
    await client.flushall();
    client.disconnect();
  });

  it('round-trips a structured value', async () => {
    await cache.set('user:1', { id: 1, plan: 'pro' });
    await expect(cache.get('user:1')).resolves.toEqual({ id: 1, plan: 'pro' });
  });

  it('returns null for an unknown key', async () => {
    await expect(cache.get('nope')).resolves.toBeNull();
  });

  it('honours the TTL when setting a key', async () => {
    await cache.set('temp', 'value', 120);
    const ttl = await client.ttl('temp');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('delete removes the key', async () => {
    await cache.set('gone', 'soon');
    await cache.delete('gone');
    await expect(cache.get('gone')).resolves.toBeNull();
  });

  it('getOrSet loads once and serves from cache thereafter', async () => {
    const loader = jest.fn().mockResolvedValue({ computed: true });

    const first = await cache.getOrSet('k', 60, loader);
    const second = await cache.getOrSet('k', 60, loader);

    expect(first).toEqual({ computed: true });
    expect(second).toEqual({ computed: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
