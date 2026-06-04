import { CompleteConnection } from '@modules/connections/application/complete-connection.usecase';
import { DisconnectConnection } from '@modules/connections/application/disconnect-connection.usecase';
import { ListConnections } from '@modules/connections/application/list-connections.usecase';
import { StartConnection } from '@modules/connections/application/start-connection.usecase';
import { Connection } from '@modules/connections/domain/connection.entity';
import {
  ConnectionNotFoundError,
  InvalidOAuthStateError,
  OAuthExchangeFailedError,
} from '@modules/connections/domain/connection.errors';
import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';
import type {
  IOAuthProvider,
  IOAuthProviderRegistry,
  OAuthAccount,
} from '@modules/connections/domain/ports/oauth-provider';
import type { IOAuthStateStore } from '@modules/connections/domain/ports/oauth-state-store';

const account: OAuthAccount = {
  externalAccountId: 'fb_123',
  displayName: 'My Page',
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  scopes: ['pages_manage_posts'],
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};

function providerMock(): jest.Mocked<IOAuthProvider> {
  return {
    getAuthorizationUrl: jest.fn().mockReturnValue('https://auth.example/url'),
    exchangeCode: jest.fn().mockResolvedValue(account),
  };
}

function registryWith(provider: IOAuthProvider): IOAuthProviderRegistry {
  return { get: jest.fn().mockReturnValue(provider) };
}

function stateStoreMock() {
  return {
    issue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn(),
  } satisfies Record<keyof IOAuthStateStore, jest.Mock>;
}

function repoMock() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByUserAndPlatform: jest.fn().mockResolvedValue(null),
    listByUser: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IConnectionRepository, jest.Mock>;
}

const config = { publicBaseUrl: 'http://localhost:4000', stateTtlSeconds: 600 };

describe('StartConnection', () => {
  it('issues state and returns the provider URL', async () => {
    const provider = providerMock();
    const stateStore = stateStoreMock();

    const result = await new StartConnection(registryWith(provider), stateStore, config).execute(
      'user-1',
      'facebook',
    );

    expect(stateStore.issue).toHaveBeenCalledWith(
      expect.any(String),
      { userId: 'user-1', platform: 'facebook' },
      600,
    );
    expect(provider.getAuthorizationUrl).toHaveBeenCalledWith({
      state: expect.any(String),
      redirectUri: 'http://localhost:4000/api/v1/connections/callback',
    });
    expect(result.authorizationUrl).toBe('https://auth.example/url');
  });
});

describe('CompleteConnection', () => {
  it('exchanges the code and creates a connection (no tokens in the DTO)', async () => {
    const provider = providerMock();
    const stateStore = stateStoreMock();
    stateStore.consume.mockResolvedValue({ userId: 'user-1', platform: 'facebook' });
    const repo = repoMock();

    const result = await new CompleteConnection(
      registryWith(provider),
      stateStore,
      repo,
      config,
    ).execute({ state: 's', code: 'c' });

    expect(stateStore.consume).toHaveBeenCalledWith('s');
    expect(provider.exchangeCode).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ platform: 'facebook', displayName: 'My Page' });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('reconnects an existing connection instead of creating a new one', async () => {
    const provider = providerMock();
    const stateStore = stateStoreMock();
    stateStore.consume.mockResolvedValue({ userId: 'user-1', platform: 'facebook' });
    const repo = repoMock();
    const existing = Connection.create({
      userId: 'user-1',
      platform: 'facebook',
      account: { ...account, displayName: 'Old Name', accessToken: 'old' },
    });
    repo.findByUserAndPlatform.mockResolvedValue(existing);

    const result = await new CompleteConnection(
      registryWith(provider),
      stateStore,
      repo,
      config,
    ).execute({ state: 's', code: 'c' });

    expect(result.id).toBe(existing.id);
    expect(repo.save).toHaveBeenCalledWith(existing);
    expect(existing.displayName).toBe('My Page');
    expect(existing.accessToken).toBe('access-tok');
  });

  it('rejects an invalid state', async () => {
    const stateStore = stateStoreMock();
    stateStore.consume.mockResolvedValue(null);

    await expect(
      new CompleteConnection(registryWith(providerMock()), stateStore, repoMock(), config).execute({
        state: 'bad',
        code: 'c',
      }),
    ).rejects.toThrow(InvalidOAuthStateError);
  });

  it('wraps a provider exchange failure', async () => {
    const provider = providerMock();
    provider.exchangeCode.mockRejectedValue(new Error('upstream'));
    const stateStore = stateStoreMock();
    stateStore.consume.mockResolvedValue({ userId: 'user-1', platform: 'facebook' });

    await expect(
      new CompleteConnection(registryWith(provider), stateStore, repoMock(), config).execute({
        state: 's',
        code: 'c',
      }),
    ).rejects.toThrow(OAuthExchangeFailedError);
  });
});

describe('ListConnections', () => {
  it('maps to public DTOs without tokens', async () => {
    const repo = repoMock();
    repo.listByUser.mockResolvedValue([
      Connection.create({ userId: 'user-1', platform: 'youtube', account }),
    ]);

    const result = await new ListConnections(repo).execute('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('accessToken');
  });
});

describe('DisconnectConnection', () => {
  it('deletes an owned connection', async () => {
    const repo = repoMock();
    const conn = Connection.create({ userId: 'user-1', platform: 'tiktok', account });
    repo.findById.mockResolvedValue(conn);

    await new DisconnectConnection(repo).execute('user-1', conn.id);
    expect(repo.delete).toHaveBeenCalledWith(conn.id);
  });

  it('404s when missing or not owned', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(null);
    await expect(new DisconnectConnection(repo).execute('user-1', 'x')).rejects.toThrow(
      ConnectionNotFoundError,
    );

    repo.findById.mockResolvedValue(
      Connection.create({ userId: 'other', platform: 'tiktok', account }),
    );
    await expect(new DisconnectConnection(repo).execute('user-1', 'x')).rejects.toThrow(
      ConnectionNotFoundError,
    );
  });
});
