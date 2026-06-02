import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

import { RedisRateLimiter } from '@shared/infrastructure/rate-limit/redis-rate-limiter';

describe('RedisRateLimiter (integration)', () => {
  let client: InstanceType<typeof RedisMock>;

  beforeEach(() => {
    client = new RedisMock();
  });

  afterEach(async () => {
    await client.flushall();
    client.disconnect();
  });

  it('allows up to the limit, then blocks', async () => {
    const limiter = new RedisRateLimiter(client as unknown as Redis, 3, 60);

    const r1 = await limiter.consume('ip-1');
    const r2 = await limiter.consume('ip-1');
    const r3 = await limiter.consume('ip-1');
    const r4 = await limiter.consume('ip-1');

    expect(r1).toMatchObject({ allowed: true, limit: 3, remaining: 2 });
    expect(r2).toMatchObject({ allowed: true, remaining: 1 });
    expect(r3).toMatchObject({ allowed: true, remaining: 0 });
    expect(r4).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('tracks separate keys independently', async () => {
    const limiter = new RedisRateLimiter(client as unknown as Redis, 1, 60);

    expect((await limiter.consume('ip-a')).allowed).toBe(true);
    expect((await limiter.consume('ip-b')).allowed).toBe(true);
    expect((await limiter.consume('ip-a')).allowed).toBe(false);
  });

  it('sets an expiry so the window resets', async () => {
    const limiter = new RedisRateLimiter(client as unknown as Redis, 5, 60);
    await limiter.consume('ip-1');

    const ttl = await client.pttl('ratelimit:ip-1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60_000);
  });

  it('reports resetSeconds from the remaining TTL', async () => {
    const limiter = new RedisRateLimiter(client as unknown as Redis, 5, 60);
    const result = await limiter.consume('ip-1');

    expect(result.resetSeconds).toBeGreaterThan(0);
    expect(result.resetSeconds).toBeLessThanOrEqual(60);
  });
});
