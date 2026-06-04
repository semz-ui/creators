import type { Redis } from 'ioredis';

import type { IOAuthStateStore, OAuthStateData } from '../domain/ports/oauth-state-store';

const key = (state: string): string => `oauth:state:${state}`;

/** Redis-backed one-time OAuth state store. */
export class RedisOAuthStateStore implements IOAuthStateStore {
  constructor(private readonly client: Redis) {}

  async issue(state: string, data: OAuthStateData, ttlSeconds: number): Promise<void> {
    await this.client.set(key(state), JSON.stringify(data), 'EX', ttlSeconds);
  }

  async consume(state: string): Promise<OAuthStateData | null> {
    const redisKey = key(state);
    const raw = await this.client.get(redisKey);
    if (raw === null) {
      return null;
    }
    // One-time use: delete immediately so the same state can't be replayed.
    await this.client.del(redisKey);
    return JSON.parse(raw) as OAuthStateData;
  }
}
