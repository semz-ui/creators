import type { Platform } from '../platform';

/** Data tied to an in-flight OAuth authorization (carried via the state token). */
export interface OAuthStateData {
  userId: string;
  platform: Platform;
  /** PKCE verifier, when the platform's provider uses PKCE (e.g. TikTok). */
  codeVerifier?: string;
}

/**
 * One-time store for OAuth `state` tokens (CSRF protection). State is issued at
 * the start of the flow and consumed exactly once at the callback.
 */
export interface IOAuthStateStore {
  issue(state: string, data: OAuthStateData, ttlSeconds: number): Promise<void>;
  /** Returns the data and invalidates the state; null if unknown/expired/used. */
  consume(state: string): Promise<OAuthStateData | null>;
}
