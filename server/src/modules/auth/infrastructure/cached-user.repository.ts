import type { ICacheService } from '@shared/infrastructure/cache/cache-service';
import { cacheKey } from '@shared/infrastructure/cache/cache-keys';

import type { IUserRepository } from '../domain/ports/user-repository';
import { User } from '../domain/user.entity';
import type { Email } from '../domain/value-objects/email';

const USER_NAMESPACE = 'user';

/** JSON-safe cache shape: snapshot with ISO date strings. */
interface UserCacheRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  createdAt: string;
  updatedAt: string;
}

function serialize(user: User): UserCacheRecord {
  const s = user.toSnapshot();
  return {
    id: s.id,
    email: s.email,
    passwordHash: s.passwordHash,
    googleId: s.googleId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function deserialize(record: UserCacheRecord): User {
  return User.fromSnapshot({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash ?? null,
    googleId: record.googleId ?? null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  });
}

/**
 * Cache-aside decorator over an {@link IUserRepository}.
 *
 * - `findById` — the hot read (auth guard + `/me`): served from cache, falling
 *   back to the inner repository and back-filling the cache.
 * - `save` — writes through to the inner repository, then invalidates the
 *   cached entry so the next read reflects the change.
 * - `findByEmail` / `existsByEmail` — delegated uncached (login path; keyed by
 *   email rather than id, and correctness-sensitive).
 */
export class CachedUserRepository implements IUserRepository {
  constructor(
    private readonly inner: IUserRepository,
    private readonly cache: ICacheService,
    private readonly ttlSeconds: number,
  ) {}

  async findById(id: string): Promise<User | null> {
    const key = cacheKey(USER_NAMESPACE, id);

    const cached = await this.cache.get<UserCacheRecord>(key);
    if (cached) {
      return deserialize(cached);
    }

    const user = await this.inner.findById(id);
    if (user) {
      await this.cache.set(key, serialize(user), this.ttlSeconds);
    }
    return user;
  }

  findByEmail(email: Email): Promise<User | null> {
    return this.inner.findByEmail(email);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.inner.findByGoogleId(googleId);
  }

  existsByEmail(email: Email): Promise<boolean> {
    return this.inner.existsByEmail(email);
  }

  async save(user: User): Promise<void> {
    await this.inner.save(user);
    await this.cache.delete(cacheKey(USER_NAMESPACE, user.id));
  }
}
