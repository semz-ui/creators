import { ConnectionAccessService } from '@modules/connections/application/connection-access.service';
import { Connection } from '@modules/connections/domain/connection.entity';
import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';
import type {
  IOAuthProvider,
  IOAuthProviderRegistry,
} from '@modules/connections/domain/ports/oauth-provider';

const USER_ID = 'user-1';

function makeConnection(overrides: { expiresAt?: Date | null; refreshToken?: string | null } = {}) {
  return Connection.create({
    userId: USER_ID,
    platform: 'youtube',
    account: {
      externalAccountId: 'UC123',
      displayName: 'My Channel',
      accessToken: 'old-access',
      refreshToken: overrides.refreshToken !== undefined ? overrides.refreshToken : '1//refresh',
      scopes: ['scope-a'],
      expiresAt:
        overrides.expiresAt !== undefined
          ? overrides.expiresAt
          : new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

function repoMock(connection: Connection | null) {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(connection),
    findByUserAndPlatform: jest.fn().mockResolvedValue(connection),
    listByUser: jest.fn(),
    delete: jest.fn(),
  } satisfies Record<keyof IConnectionRepository, jest.Mock>;
}

function providerMock(): jest.Mocked<IOAuthProvider> {
  return {
    getAuthorizationUrl: jest.fn(),
    exchangeCode: jest.fn(),
    refreshAccessToken: jest.fn().mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }),
  };
}

function build(connection: Connection | null, provider = providerMock()) {
  const repo = repoMock(connection);
  const registry: IOAuthProviderRegistry = { get: jest.fn().mockReturnValue(provider) };
  return { service: new ConnectionAccessService(repo, registry), repo, provider };
}

describe('ConnectionAccessService', () => {
  it('returns the stored token untouched when it is not close to expiry', async () => {
    const connection = makeConnection();
    const { service, repo, provider } = build(connection);

    const result = await service.getFreshConnection(USER_ID, 'youtube');

    expect(result).toEqual({ connectionId: connection.id, accessToken: 'old-access' });
    expect(provider.refreshAccessToken).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('refreshes and persists an expiring token', async () => {
    const connection = makeConnection({ expiresAt: new Date(Date.now() + 30 * 1000) });
    const { service, repo, provider } = build(connection);

    const result = await service.getFreshConnection(USER_ID, 'youtube');

    expect(result).toEqual({ connectionId: connection.id, accessToken: 'new-access' });
    expect(provider.refreshAccessToken).toHaveBeenCalledWith('1//refresh');
    expect(repo.save).toHaveBeenCalledWith(connection);
    expect(connection.accessToken).toBe('new-access');
    // Google did not rotate the refresh token — keep the stored one.
    expect(connection.refreshToken).toBe('1//refresh');
  });

  it('marks the connection expired when there is no refresh token', async () => {
    const connection = makeConnection({
      expiresAt: new Date(Date.now() - 1000),
      refreshToken: null,
    });
    const { service, repo, provider } = build(connection);

    expect(await service.getFreshConnection(USER_ID, 'youtube')).toBeNull();
    expect(connection.status).toBe('expired');
    expect(repo.save).toHaveBeenCalledWith(connection);
    expect(provider.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('marks the connection expired when the provider rejects the refresh', async () => {
    const connection = makeConnection({ expiresAt: new Date(Date.now() - 1000) });
    const provider = providerMock();
    provider.refreshAccessToken.mockRejectedValue(new Error('invalid_grant'));
    const { service, repo } = build(connection, provider);

    expect(await service.getFreshConnection(USER_ID, 'youtube')).toBeNull();
    expect(connection.status).toBe('expired');
    expect(repo.save).toHaveBeenCalledWith(connection);
  });

  it('returns null for missing, foreign, or non-active connections', async () => {
    expect(await build(null).service.getFreshConnection(USER_ID, 'youtube')).toBeNull();

    const foreign = makeConnection();
    expect(
      await build(foreign).service.getFreshConnectionById('other-user', foreign.id),
    ).toBeNull();

    const revoked = makeConnection();
    revoked.markRevoked();
    const { service, provider } = build(revoked);
    expect(await service.getFreshConnectionById(USER_ID, revoked.id)).toBeNull();
    expect(provider.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('resolves by connection id through findById', async () => {
    const connection = makeConnection();
    const { service, repo } = build(connection);

    const result = await service.getFreshConnectionById(USER_ID, connection.id);

    expect(result).toEqual({ connectionId: connection.id, accessToken: 'old-access' });
    expect(repo.findById).toHaveBeenCalledWith(connection.id);
  });
});
