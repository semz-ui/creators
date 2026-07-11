/**
 * Server-side store for one-time password-reset tokens (Redis in production).
 *
 * Callers pass the raw token; how it is protected at rest (hashing) is the
 * adapter's concern. At most one token is active per user: issuing a new one
 * invalidates any previous token for that user.
 */
export interface IPasswordResetTokenStore {
  /** Record a freshly generated token for a user, expiring after `ttlSeconds`. */
  issue(token: string, userId: string, ttlSeconds: number): Promise<void>;
  /**
   * Redeem a token: returns the owning userId and invalidates it (one-time
   * use), or null if the token is unknown, expired, or already used.
   */
  consume(token: string): Promise<string | null>;
}
