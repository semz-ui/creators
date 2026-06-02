import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { InvalidTokenError } from '../domain/auth.errors';
import type { ITokenService, RefreshTokenPayload } from '../domain/ports/token-service';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

/** jsonwebtoken implementation of {@link ITokenService}. */
export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtConfig) {}

  issueAccessToken(userId: string): string {
    return jwt.sign({ type: 'access' }, this.config.accessSecret, {
      subject: userId,
      expiresIn: this.config.accessTtl as ExpiresIn,
    });
  }

  verifyAccessToken(token: string): { userId: string } {
    const decoded = this.verify(token, this.config.accessSecret);
    if (decoded.type !== 'access' || typeof decoded.sub !== 'string') {
      throw new InvalidTokenError();
    }
    return { userId: decoded.sub };
  }

  issueRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(
      { type: 'refresh', jti: payload.jti, fam: payload.familyId },
      this.config.refreshSecret,
      { subject: payload.userId, expiresIn: this.config.refreshTtl as ExpiresIn },
    );
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = this.verify(token, this.config.refreshSecret);
    if (
      decoded.type !== 'refresh' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.jti !== 'string' ||
      typeof decoded.fam !== 'string'
    ) {
      throw new InvalidTokenError();
    }
    return { userId: decoded.sub, jti: decoded.jti, familyId: decoded.fam };
  }

  private verify(token: string, secret: string): JwtPayload & Record<string, unknown> {
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new InvalidTokenError();
      }
      return decoded as JwtPayload & Record<string, unknown>;
    } catch (err) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError();
    }
  }
}
