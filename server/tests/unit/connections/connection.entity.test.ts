import { Connection } from '@modules/connections/domain/connection.entity';

function makeConnection(expiresAt: Date | null) {
  return Connection.create({
    userId: 'user-1',
    platform: 'youtube',
    account: {
      externalAccountId: 'UC123',
      displayName: 'My Channel',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      scopes: ['scope-a'],
      expiresAt,
    },
  });
}

describe('Connection.needsRefresh', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('is false when the token never expires', () => {
    expect(makeConnection(null).needsRefresh(120, now)).toBe(false);
  });

  it('is true only when expiry falls within the buffer', () => {
    const connection = makeConnection(new Date('2026-01-01T12:01:00Z'));
    expect(connection.needsRefresh(120, now)).toBe(true);
    expect(connection.needsRefresh(30, now)).toBe(false);
  });

  it('is true for already-expired tokens', () => {
    expect(makeConnection(new Date('2026-01-01T11:00:00Z')).needsRefresh(120, now)).toBe(true);
  });

  it('is false for non-active connections', () => {
    const connection = makeConnection(new Date('2026-01-01T11:00:00Z'));
    connection.markRevoked();
    expect(connection.needsRefresh(120, now)).toBe(false);
  });
});

describe('Connection.applyRefreshedTokens', () => {
  it('updates the access token and expiry, keeping the refresh token when not rotated', () => {
    const connection = makeConnection(new Date('2026-01-01T12:00:00Z'));
    const newExpiry = new Date('2026-01-01T13:00:00Z');

    connection.applyRefreshedTokens({
      accessToken: 'access-2',
      refreshToken: null,
      expiresAt: newExpiry,
    });

    expect(connection.accessToken).toBe('access-2');
    expect(connection.refreshToken).toBe('refresh-1');
    expect(connection.expiresAt).toEqual(newExpiry);
  });

  it('replaces the refresh token when the provider rotates it', () => {
    const connection = makeConnection(new Date('2026-01-01T12:00:00Z'));

    connection.applyRefreshedTokens({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresAt: null,
    });

    expect(connection.refreshToken).toBe('refresh-2');
    expect(connection.expiresAt).toBeNull();
  });
});

describe('Connection.markExpired', () => {
  it('transitions the status to expired and survives a snapshot round-trip', () => {
    const connection = makeConnection(null);
    connection.markExpired();

    expect(connection.status).toBe('expired');
    expect(Connection.fromSnapshot(connection.toSnapshot()).status).toBe('expired');
  });
});
