import { InvalidTokenError } from '../domain/auth.errors';
import type { IRefreshTokenStore } from '../domain/ports/refresh-token-store';
import type { ITokenService } from '../domain/ports/token-service';
import type { AuthTokens, RefreshInput } from './dto';
import type { SessionService } from './session.service';

/**
 * Exchanges a valid refresh token for a new token pair (rotation).
 *
 * Reuse detection: a token that verifies but is no longer present in the store
 * has already been rotated — a replay. We revoke the whole family so a stolen
 * token can't be used even if the attacker raced a legitimate refresh.
 */
export class RefreshTokens {
  constructor(
    private readonly tokens: ITokenService,
    private readonly store: IRefreshTokenStore,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: RefreshInput): Promise<AuthTokens> {
    const payload = this.tokens.verifyRefreshToken(input.refreshToken);

    const active = await this.store.exists(payload.jti);
    if (!active) {
      await this.store.revokeFamily(payload.familyId);
      throw new InvalidTokenError();
    }

    return this.sessions.rotate(payload.userId, payload.familyId, payload.jti);
  }
}
