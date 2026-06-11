import { logger } from '@shared/infrastructure/logging/logger';

import type { Connection } from '../domain/connection.entity';
import type { IConnectionRepository } from '../domain/ports/connection-repository';
import type { IOAuthProviderRegistry } from '../domain/ports/oauth-provider';
import type { Platform } from '../domain/platform';

/** Refresh when the token expires within this window, so it outlives the caller's work. */
const REFRESH_BUFFER_SECONDS = 120;

export interface FreshConnection {
  connectionId: string;
  accessToken: string;
}

/**
 * Hands out access tokens guaranteed fresh for at least the buffer window.
 * Expiring tokens are refreshed via the platform's OAuth provider and
 * persisted; when refresh is impossible or rejected the connection is marked
 * 'expired' and null is returned — callers treat that exactly like "no active
 * connection" (the user must reconnect).
 */
export class ConnectionAccessService {
  constructor(
    private readonly connections: IConnectionRepository,
    private readonly providers: IOAuthProviderRegistry,
  ) {}

  async getFreshConnection(userId: string, platform: Platform): Promise<FreshConnection | null> {
    return this.ensureFresh(userId, await this.connections.findByUserAndPlatform(userId, platform));
  }

  async getFreshConnectionById(
    userId: string,
    connectionId: string,
  ): Promise<FreshConnection | null> {
    return this.ensureFresh(userId, await this.connections.findById(connectionId));
  }

  private async ensureFresh(
    userId: string,
    connection: Connection | null,
  ): Promise<FreshConnection | null> {
    if (!connection || connection.userId !== userId || connection.status !== 'active') {
      return null;
    }
    if (!connection.needsRefresh(REFRESH_BUFFER_SECONDS)) {
      return { connectionId: connection.id, accessToken: connection.accessToken };
    }
    if (connection.refreshToken === null) {
      connection.markExpired();
      await this.connections.save(connection);
      return null;
    }
    try {
      const provider = this.providers.get(connection.platform);
      connection.applyRefreshedTokens(await provider.refreshAccessToken(connection.refreshToken));
    } catch (err) {
      logger.warn(
        { err, connectionId: connection.id, platform: connection.platform },
        'OAuth token refresh failed',
      );
      connection.markExpired();
      await this.connections.save(connection);
      return null;
    }
    await this.connections.save(connection);
    return { connectionId: connection.id, accessToken: connection.accessToken };
  }
}
