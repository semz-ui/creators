import type { Platform } from '../platform';

/** Account + tokens returned by a provider after exchanging the auth code. */
export interface OAuthAccount {
  externalAccountId: string;
  displayName: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: Date | null;
}

/** A single platform's OAuth integration. */
export interface IOAuthProvider {
  getAuthorizationUrl(params: { state: string; redirectUri: string }): string;
  exchangeCode(params: { code: string; redirectUri: string }): Promise<OAuthAccount>;
}

/** Resolves the provider for a platform. */
export interface IOAuthProviderRegistry {
  /** Throws {@link import('../connection.errors').UnsupportedPlatformError} if none registered. */
  get(platform: Platform): IOAuthProvider;
}
