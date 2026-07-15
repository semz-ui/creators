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

/**
 * Tokens returned by a refresh. `refreshToken` is null when the provider does
 * not rotate it (Google's normal behavior) — callers keep the stored one.
 */
export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/**
 * Result of building an authorization URL. `codeVerifier` is present only when
 * the provider uses PKCE — the caller persists it with the OAuth state and
 * replays it at {@link IOAuthProvider.exchangeCode}. It is opaque to the caller.
 */
export interface AuthorizationRequest {
  url: string;
  codeVerifier?: string;
}

/** A single platform's OAuth integration. */
export interface IOAuthProvider {
  getAuthorizationUrl(params: { state: string; redirectUri: string }): AuthorizationRequest;
  exchangeCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<OAuthAccount>;
  refreshAccessToken(refreshToken: string): Promise<RefreshedTokens>;
}

/** Resolves the provider for a platform. */
export interface IOAuthProviderRegistry {
  /** Throws {@link import('../connection.errors').UnsupportedPlatformError} if none registered. */
  get(platform: Platform): IOAuthProvider;
}
