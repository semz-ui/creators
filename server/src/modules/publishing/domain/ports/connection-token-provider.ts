import type { Platform } from '@modules/connections/domain/platform';

export interface ActiveConnection {
  connectionId: string;
  accessToken: string;
}

/**
 * Cross-module read port: resolves a user's active connection (with token).
 * Implemented by an adapter over the Connections module.
 */
export interface IConnectionTokenProvider {
  /**
   * The user's currently active connection for a platform. Used at creation
   * time to capture which account a publication targets.
   */
  getActiveConnection(userId: string, platform: Platform): Promise<ActiveConnection | null>;
  /**
   * A specific connection by id, if it is still active and owned by the user.
   * Used at distribution time so a scheduled post goes to the exact account it
   * was bound to, even if the user has since switched their active account.
   */
  getActiveConnectionById(userId: string, connectionId: string): Promise<ActiveConnection | null>;
}
