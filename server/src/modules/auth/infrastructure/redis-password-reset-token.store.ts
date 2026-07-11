import { createHash } from 'node:crypto';

import type { Redis } from 'ioredis';

import type { IPasswordResetTokenStore } from '../domain/ports/password-reset-token-store';

// The raw token travels by email, so only its SHA-256 is stored: a Redis
// dump/leak cannot be replayed into a working reset link.
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const tokenKey = (tokenHash: string): string => `pwdreset:token:${tokenHash}`;
const userKey = (userId: string): string => `pwdreset:user:${userId}`;

/** Redis-backed one-time password-reset token store (one active token per user). */
export class RedisPasswordResetTokenStore implements IPasswordResetTokenStore {
  constructor(private readonly client: Redis) {}

  async issue(token: string, userId: string, ttlSeconds: number): Promise<void> {
    const tokenHash = hashToken(token);
    // Last-requested wins: drop the user's previous token, if any.
    const previousHash = await this.client.get(userKey(userId));
    if (previousHash !== null) {
      await this.client.del(tokenKey(previousHash));
    }
    await this.client
      .multi()
      .set(tokenKey(tokenHash), userId, 'EX', ttlSeconds)
      .set(userKey(userId), tokenHash, 'EX', ttlSeconds)
      .exec();
  }

  async consume(token: string): Promise<string | null> {
    const tokenHash = hashToken(token);
    const userId = await this.client.get(tokenKey(tokenHash));
    if (userId === null) {
      return null;
    }
    // One-time use: delete immediately so the same token can't be replayed.
    await this.client.del(tokenKey(tokenHash), userKey(userId));
    return userId;
  }
}
