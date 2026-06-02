import type { IRefreshTokenStore } from '../domain/ports/refresh-token-store';
import type { ITokenService } from '../domain/ports/token-service';
import type { RefreshInput } from './dto';

/**
 * Ends a single session by revoking the presented refresh token. Idempotent:
 * an invalid/expired token is treated as already-logged-out (no error), so
 * logout never fails for the client.
 */
export class LogoutUser {
  constructor(
    private readonly tokens: ITokenService,
    private readonly store: IRefreshTokenStore,
  ) {}

  async execute(input: RefreshInput): Promise<void> {
    try {
      const { familyId, jti } = this.tokens.verifyRefreshToken(input.refreshToken);
      await this.store.remove({ familyId, jti });
    } catch {
      // Token unverifiable — nothing to revoke. Succeed silently.
    }
  }
}

/** Ends every session for a user (logout everywhere). */
export class LogoutAllSessions {
  constructor(private readonly store: IRefreshTokenStore) {}

  async execute(userId: string): Promise<void> {
    await this.store.revokeUser(userId);
  }
}
