/**
 * Presentation-layer DTOs for the auth module: the exact JSON shapes this API
 * puts on the wire. Owned by the presentation layer and deliberately separate
 * from the application DTOs (`application/dto.ts`) — the presenter maps one to
 * the other so neither layer's contract drifts into the other.
 */

export interface UserResponse {
  id: string;
  email: string;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResultResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}
