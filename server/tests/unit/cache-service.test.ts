import type { Redis } from 'ioredis';

import { RedisCacheService } from '@shared/infrastructure/cache/cache-service';

function createClientMock() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
}

function makeService(mock: ReturnType<typeof createClientMock>) {
  return new RedisCacheService(mock as unknown as Redis);
}

describe('RedisCacheService', () => {
  it('get returns null when the key is absent', async () => {
    const client = createClientMock();
    client.get.mockResolvedValue(null);

    await expect(makeService(client).get('missing')).resolves.toBeNull();
  });

  it('get JSON-parses the stored value', async () => {
    const client = createClientMock();
    client.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'reelo' }));

    await expect(makeService(client).get('user:1')).resolves.toEqual({ id: 1, name: 'reelo' });
  });

  it('set without TTL stores a JSON string and no expiry', async () => {
    const client = createClientMock();
    await makeService(client).set('k', { a: 1 });

    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }));
  });

  it('set with TTL passes the EX expiry', async () => {
    const client = createClientMock();
    await makeService(client).set('k', 'v', 60);

    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify('v'), 'EX', 60);
  });

  it('delete forwards to del', async () => {
    const client = createClientMock();
    await makeService(client).delete('k');

    expect(client.del).toHaveBeenCalledWith('k');
  });

  describe('getOrSet', () => {
    it('returns the cached value without invoking the loader', async () => {
      const client = createClientMock();
      client.get.mockResolvedValue(JSON.stringify('cached'));
      const loader = jest.fn();

      const value = await makeService(client).getOrSet('k', 30, loader);

      expect(value).toBe('cached');
      expect(loader).not.toHaveBeenCalled();
      expect(client.set).not.toHaveBeenCalled();
    });

    it('runs the loader and caches the result on a miss', async () => {
      const client = createClientMock();
      client.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue({ fresh: true });

      const value = await makeService(client).getOrSet('k', 30, loader);

      expect(value).toEqual({ fresh: true });
      expect(loader).toHaveBeenCalledTimes(1);
      expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ fresh: true }), 'EX', 30);
    });
  });
});
