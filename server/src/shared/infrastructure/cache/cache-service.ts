import { redis } from '@shared/infrastructure/cache/redis';

/**
 * Cache port. Application/use-case code depends on this interface, never on
 * ioredis directly — keeping the inner layers infrastructure-agnostic and
 * letting us swap the backend (or fake it in tests) without touching callers.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /**
   * Cache-aside helper: return the cached value, or run `loader`, cache its
   * result, and return it. The default for hot reads.
   */
  getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>;
}

/** Redis-backed implementation of {@link ICacheService}. Values are JSON-encoded. */
export class RedisCacheService implements ICacheService {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
