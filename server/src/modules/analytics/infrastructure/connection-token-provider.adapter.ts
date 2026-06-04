import type { Platform } from '@modules/connections/domain/platform';
import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';

import type { IConnectionTokenProvider } from '../domain/ports/connection-token-provider';

/**
 * Implements {@link IConnectionTokenProvider} over the Connections repository,
 * surfacing the access token only for active connections.
 */
export class ConnectionTokenProviderAdapter implements IConnectionTokenProvider {
  constructor(private readonly connections: IConnectionRepository) {}

  async getActiveConnection(
    userId: string,
    platform: Platform,
  ): Promise<{ accessToken: string } | null> {
    const connection = await this.connections.findByUserAndPlatform(userId, platform);
    if (!connection || connection.status !== 'active') {
      return null;
    }
    return { accessToken: connection.accessToken };
  }
}
