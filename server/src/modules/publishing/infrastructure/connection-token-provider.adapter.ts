import type { Platform } from '@modules/connections/domain/platform';
import type { IConnectionRepository } from '@modules/connections/domain/ports/connection-repository';

import type {
  ActiveConnection,
  IConnectionTokenProvider,
} from '../domain/ports/connection-token-provider';

/**
 * Implements the publishing-side {@link IConnectionTokenProvider} over the
 * Connections module's repository (which decrypts tokens). Only returns active
 * connections.
 */
export class ConnectionTokenProviderAdapter implements IConnectionTokenProvider {
  constructor(private readonly connections: IConnectionRepository) {}

  async getActiveConnection(userId: string, platform: Platform): Promise<ActiveConnection | null> {
    const connection = await this.connections.findByUserAndPlatform(userId, platform);
    if (!connection || connection.status !== 'active') {
      return null;
    }
    return { connectionId: connection.id, accessToken: connection.accessToken };
  }

  async getActiveConnectionById(
    userId: string,
    connectionId: string,
  ): Promise<ActiveConnection | null> {
    const connection = await this.connections.findById(connectionId);
    if (!connection || connection.userId !== userId || connection.status !== 'active') {
      return null;
    }
    return { connectionId: connection.id, accessToken: connection.accessToken };
  }
}
