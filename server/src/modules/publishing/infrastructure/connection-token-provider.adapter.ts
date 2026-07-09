import type { ConnectionAccessService } from '@modules/connections/application/connection-access.service';
import type { Platform } from '@modules/connections/domain/platform';

import type {
  ActiveConnection,
  IConnectionTokenProvider,
} from '../domain/ports/connection-token-provider';

/**
 * Implements the publishing-side {@link IConnectionTokenProvider} over the
 * Connections module's access service, so tokens handed to publishers are
 * fresh (expiring ones get refreshed; unrefreshable connections read as
 * inactive).
 */
export class ConnectionTokenProviderAdapter implements IConnectionTokenProvider {
  constructor(private readonly connectionAccess: ConnectionAccessService) {}

  getActiveConnection(userId: string, platform: Platform): Promise<ActiveConnection | null> {
    return this.connectionAccess.getFreshConnection(userId, platform);
  }

  getActiveConnectionById(userId: string, connectionId: string): Promise<ActiveConnection | null> {
    return this.connectionAccess.getFreshConnectionById(userId, connectionId);
  }
}
