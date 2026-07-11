import { createHash } from 'node:crypto';

import type { Redis } from 'ioredis';

import type { IPasswordResetTokenStore } from '../domain/ports/password-reset-token-store';

// The raw token travels by email, so only its SHA-256 is stored: a Redis
// dump/leak cannot be replayed into a working reset link.
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const TOKEN_PREFIX = 'pwdreset:token:';
const USER_PREFIX = 'pwdreset:user:';

const tokenKey = (tokenHash: string): string => `${TOKEN_PREFIX}${tokenHash}`;
const userKey = (userId: string): string => `${USER_PREFIX}${userId}`;

// Both scripts run atomically inside Redis, so concurrent issue/consume calls
// can't interleave: issue can't leave two live tokens for one user, and two
// concurrent consumes of the same token can't both succeed. (The scripts build
// secondary keys from stored values, which assumes a non-cluster Redis.)
const ISSUE_SCRIPT = `
local prev = redis.call('GET', KEYS[2])
if prev then
  redis.call('DEL', ARGV[3] .. prev)
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('SET', KEYS[2], ARGV[4], 'EX', ARGV[2])
return 1
`;

const CONSUME_SCRIPT = `
local userId = redis.call('GET', KEYS[1])
if not userId then
  return nil
end
redis.call('DEL', KEYS[1])
local userKey = ARGV[2] .. userId
if redis.call('GET', userKey) == ARGV[1] then
  redis.call('DEL', userKey)
end
return userId
`;

/** Redis-backed one-time password-reset token store (one active token per user). */
export class RedisPasswordResetTokenStore implements IPasswordResetTokenStore {
  constructor(private readonly client: Redis) {}

  async issue(token: string, userId: string, ttlSeconds: number): Promise<void> {
    const tokenHash = hashToken(token);
    // Last-requested wins: the script atomically drops the user's previous
    // token (if any) and records the new one.
    await this.client.eval(
      ISSUE_SCRIPT,
      2,
      tokenKey(tokenHash),
      userKey(userId),
      userId,
      ttlSeconds,
      TOKEN_PREFIX,
      tokenHash,
    );
  }

  async consume(token: string): Promise<string | null> {
    const tokenHash = hashToken(token);
    // One-time use: the script reads and deletes in one atomic step, so a
    // token can never be redeemed twice.
    const userId = await this.client.eval(
      CONSUME_SCRIPT,
      1,
      tokenKey(tokenHash),
      tokenHash,
      USER_PREFIX,
    );
    return (userId as string | null) ?? null;
  }
}
