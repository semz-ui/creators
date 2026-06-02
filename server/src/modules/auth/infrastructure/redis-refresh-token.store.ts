import type { Redis } from 'ioredis';

import type { IRefreshTokenStore, StoredRefreshToken } from '../domain/ports/refresh-token-store';

const tokenKey = (jti: string): string => `auth:rt:${jti}`;
const familyKey = (familyId: string): string => `auth:rtfam:${familyId}`;
const userKey = (userId: string): string => `auth:rtuser:${userId}`;

/**
 * Redis implementation of {@link IRefreshTokenStore}.
 *
 * Layout (all keys expire after the refresh TTL):
 * - `auth:rt:{jti}`        → userId               (existence = token is active)
 * - `auth:rtfam:{familyId}`→ SET of jtis          (for family revocation)
 * - `auth:rtuser:{userId}` → SET of familyIds      (for logout-everywhere)
 */
export class RedisRefreshTokenStore implements IRefreshTokenStore {
  constructor(
    private readonly client: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async save({ userId, familyId, jti }: StoredRefreshToken): Promise<void> {
    await this.client
      .multi()
      .set(tokenKey(jti), userId, 'EX', this.ttlSeconds)
      .sadd(familyKey(familyId), jti)
      .expire(familyKey(familyId), this.ttlSeconds)
      .sadd(userKey(userId), familyId)
      .expire(userKey(userId), this.ttlSeconds)
      .exec();
  }

  async exists(jti: string): Promise<boolean> {
    return (await this.client.exists(tokenKey(jti))) === 1;
  }

  async remove({ familyId, jti }: { familyId: string; jti: string }): Promise<void> {
    await this.client.multi().del(tokenKey(jti)).srem(familyKey(familyId), jti).exec();
  }

  async revokeFamily(familyId: string): Promise<void> {
    const jtis = await this.client.smembers(familyKey(familyId));
    const pipeline = this.client.multi();
    for (const jti of jtis) {
      pipeline.del(tokenKey(jti));
    }
    pipeline.del(familyKey(familyId));
    await pipeline.exec();
  }

  async revokeUser(userId: string): Promise<void> {
    const familyIds = await this.client.smembers(userKey(userId));
    for (const familyId of familyIds) {
      await this.revokeFamily(familyId);
    }
    await this.client.del(userKey(userId));
  }
}
