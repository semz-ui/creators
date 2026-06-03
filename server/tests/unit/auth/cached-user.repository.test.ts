import type { ICacheService } from '@shared/infrastructure/cache/cache-service';

import { CachedUserRepository } from '@modules/auth/infrastructure/cached-user.repository';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

const TTL = 300;

function setup() {
  const user = User.register(Email.create('a@b.com'), 'hash');

  const inner = {
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn().mockResolvedValue(user),
    existsByEmail: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getOrSet: jest.fn(),
  } satisfies Record<keyof ICacheService, jest.Mock>;

  const repo = new CachedUserRepository(inner, cache, TTL);
  return { user, inner, cache, repo };
}

describe('CachedUserRepository', () => {
  it('findById miss loads from inner and back-fills the cache', async () => {
    const { user, inner, cache, repo } = setup();

    const result = await repo.findById(user.id);

    expect(result?.id).toBe(user.id);
    expect(inner.findById).toHaveBeenCalledWith(user.id);
    expect(cache.set).toHaveBeenCalledWith(
      `user:${user.id}`,
      expect.objectContaining({ id: user.id, email: 'a@b.com' }),
      TTL,
    );
  });

  it('findById hit returns the cached user without touching the inner repo', async () => {
    const { user, inner, cache, repo } = setup();
    cache.get.mockResolvedValue({
      id: user.id,
      email: 'a@b.com',
      passwordHash: 'hash',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });

    const result = await repo.findById(user.id);

    expect(result?.id).toBe(user.id);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.createdAt.getTime()).toBe(user.createdAt.getTime());
    expect(inner.findById).not.toHaveBeenCalled();
  });

  it('does not cache a miss when the user is absent', async () => {
    const { inner, cache, repo } = setup();
    inner.findById.mockResolvedValue(null);

    expect(await repo.findById('missing')).toBeNull();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('save writes through and invalidates the cached entry', async () => {
    const { user, inner, cache, repo } = setup();

    await repo.save(user);

    expect(inner.save).toHaveBeenCalledWith(user);
    expect(cache.delete).toHaveBeenCalledWith(`user:${user.id}`);
  });

  it('delegates findByEmail and existsByEmail uncached', async () => {
    const { inner, cache, repo } = setup();

    await repo.findByEmail(Email.create('a@b.com'));
    await repo.existsByEmail(Email.create('a@b.com'));

    expect(inner.findByEmail).toHaveBeenCalled();
    expect(inner.existsByEmail).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });
});
