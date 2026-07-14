import type { AuthResult, AuthTokens, PublicUser } from '../application/dto';

/**
 * Wire shapes for the auth module: every field this API returns is enumerated
 * here, so the presentation layer — not the use-case DTO — owns the contract.
 */

export function presentUser(user: PublicUser) {
  return {
    id: user.id,
    email: user.email,
  };
}

export function presentTokens(tokens: AuthTokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function presentAuthResult(result: AuthResult) {
  return {
    user: presentUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}
