/** A refresh token's server-side record, keyed for rotation and revocation. */
export interface StoredRefreshToken {
  userId: string;
  familyId: string;
  jti: string;
}

/**
 * Server-side store for active refresh tokens (Redis in production).
 *
 * Enables rotation with reuse detection: each issued refresh token is recorded
 * by `jti`. On refresh, a token whose `jti` is absent is treated as a replay of
 * an already-rotated token, and its entire family is revoked.
 */
export interface IRefreshTokenStore {
  /** Record a newly issued refresh token. */
  save(token: StoredRefreshToken): Promise<void>;
  /** True if this exact refresh token (`jti`) is still active. */
  exists(jti: string): Promise<boolean>;
  /** Remove a single refresh token (e.g. after rotation or single-session logout). */
  remove(ref: { familyId: string; jti: string }): Promise<void>;
  /** Revoke every token in a session family (rotation reuse → compromise). */
  revokeFamily(familyId: string): Promise<void>;
  /** Revoke every session for a user (logout everywhere). */
  revokeUser(userId: string): Promise<void>;
}
