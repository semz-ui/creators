import { createHash } from 'node:crypto';

import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

import { RedisPasswordResetTokenStore } from '@modules/auth/infrastructure/redis-password-reset-token.store';

const sha256 = (token: string): string => createHash('sha256').update(token).digest('hex');

describe('RedisPasswordResetTokenStore (integration)', () => {
  let client: InstanceType<typeof RedisMock>;
  let store: RedisPasswordResetTokenStore;

  beforeEach(() => {
    client = new RedisMock();
    store = new RedisPasswordResetTokenStore(client as unknown as Redis);
  });

  afterEach(async () => {
    await client.flushall();
    client.disconnect();
  });

  it('issues then consumes a token exactly once', async () => {
    await store.issue('tok-1', 'u1', 900);

    expect(await store.consume('tok-1')).toBe('u1');
    // Second consume is null — one-time use.
    expect(await store.consume('tok-1')).toBeNull();
  });

  it('returns null for an unknown token', async () => {
    expect(await store.consume('nope')).toBeNull();
  });

  it('sets a TTL on issued tokens', async () => {
    await store.issue('tok-2', 'u1', 900);
    const ttl = await client.ttl(`pwdreset:token:${sha256('tok-2')}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });

  it('stores only the token hash, never the raw token', async () => {
    await store.issue('tok-3', 'u1', 900);

    const keys = await client.keys('*');
    expect(keys).toContain(`pwdreset:token:${sha256('tok-3')}`);
    expect(keys.some((key) => key.includes('tok-3'))).toBe(false);
  });

  it('invalidates the previous token when a new one is issued for the same user', async () => {
    await store.issue('tok-old', 'u1', 900);
    await store.issue('tok-new', 'u1', 900);

    expect(await store.consume('tok-old')).toBeNull();
    expect(await store.consume('tok-new')).toBe('u1');
  });
});
