import { cacheKey } from '@shared/infrastructure/cache/cache-keys';

describe('cacheKey', () => {
  it('joins namespace and parts with colons', () => {
    expect(cacheKey('user', '123')).toBe('user:123');
    expect(cacheKey('session', 'abc', 1)).toBe('session:abc:1');
  });

  it('returns the bare namespace when no parts are given', () => {
    expect(cacheKey('user')).toBe('user');
  });
});
