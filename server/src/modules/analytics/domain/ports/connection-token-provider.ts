import type { Platform } from '@modules/connections/domain/platform';

/**
 * Cross-module read port: the user's active access token for a platform (needed
 * to query that platform's metrics API). Implemented over the Connections module.
 */
export interface IConnectionTokenProvider {
  getActiveConnection(userId: string, platform: Platform): Promise<{ accessToken: string } | null>;
}
