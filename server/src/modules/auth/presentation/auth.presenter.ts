import type { AuthResult, AuthTokens, PublicUser } from '../application/dto';

import type {
  AuthResultResponse,
  PasswordResetRequestResponse,
  TokensResponse,
  UserResponse,
} from './auth.dto';

/**
 * Maps the auth application DTOs to the presentation DTOs sent on the wire.
 * Every field is enumerated here, so the presentation layer owns its contract.
 */

export function presentUser(user: PublicUser): UserResponse {
  return {
    id: user.id,
    email: user.email,
  };
}

export function presentTokens(tokens: AuthTokens): TokensResponse {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function presentAuthResult(result: AuthResult): AuthResultResponse {
  return {
    user: presentUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

/** Anti-enumeration: the same message whether or not the account exists. */
export function presentPasswordResetRequest(): PasswordResetRequestResponse {
  return {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
}
