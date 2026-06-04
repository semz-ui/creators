import type { Platform } from '@modules/connections/domain/platform';

export interface ActiveConnection {
  connectionId: string;
  accessToken: string;
}

/**
 * Cross-module read port: resolves the user's active connection (with token)
 * for a platform. Implemented by an adapter over the Connections module.
 */
export interface IConnectionTokenProvider {
  getActiveConnection(userId: string, platform: Platform): Promise<ActiveConnection | null>;
}
