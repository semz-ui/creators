/** Outcome of consuming a single request against a rate-limit bucket. */
export interface RateLimitResult {
  /** Whether this request is within the limit. */
  allowed: boolean;
  /** Maximum requests permitted per window. */
  limit: number;
  /** Requests remaining in the current window (never negative). */
  remaining: number;
  /** Seconds until the current window resets. */
  resetSeconds: number;
}

/**
 * Rate-limiter port. Presentation middleware depends on this interface, not on
 * a concrete Redis/in-memory implementation.
 */
export interface IRateLimiter {
  /** Count one request for `key` and report whether it is allowed. */
  consume(key: string): Promise<RateLimitResult>;
}
