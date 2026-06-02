import { randomUUID } from 'node:crypto';

import type { IRefreshTokenStore } from '../domain/ports/refresh-token-store';
import type { ITokenService } from '../domain/ports/token-service';
import type { AuthTokens } from './dto';

/**
 * Issues and rotates authentication sessions (access + refresh token pairs),
 * keeping the server-side refresh-token store in sync. Shared by the
 * register/login (new session) and refresh (rotated session) use cases.
 */
export class SessionService {
  constructor(
    private readonly tokens: ITokenService,
    private readonly store: IRefreshTokenStore,
  ) {}

  /** Start a brand-new session family (login / register). */
  async issue(userId: string): Promise<AuthTokens> {
    const familyId = randomUUID();
    const jti = randomUUID();

    await this.store.save({ userId, familyId, jti });

    return {
      accessToken: this.tokens.issueAccessToken(userId),
      refreshToken: this.tokens.issueRefreshToken({ userId, jti, familyId }),
    };
  }

  /**
   * Rotate a session: invalidate the presented refresh token and mint a new
   * one within the same family, plus a fresh access token.
   */
  async rotate(userId: string, familyId: string, previousJti: string): Promise<AuthTokens> {
    const jti = randomUUID();

    await this.store.remove({ familyId, jti: previousJti });
    await this.store.save({ userId, familyId, jti });

    return {
      accessToken: this.tokens.issueAccessToken(userId),
      refreshToken: this.tokens.issueRefreshToken({ userId, jti, familyId }),
    };
  }
}
