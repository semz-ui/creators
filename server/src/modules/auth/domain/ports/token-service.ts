/** Claims embedded in a refresh token (and tracked server-side for rotation). */
export interface RefreshTokenPayload {
  userId: string;
  /** Unique id of this specific refresh token. */
  jti: string;
  /** Session family id — shared by every token rotated from the same login. */
  familyId: string;
}

/**
 * Port for signing and verifying JWTs. Implementations throw an
 * {@link import('../auth.errors').InvalidTokenError} on any verification failure.
 */
export interface ITokenService {
  issueAccessToken(userId: string): string;
  verifyAccessToken(token: string): { userId: string };
  issueRefreshToken(payload: RefreshTokenPayload): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
