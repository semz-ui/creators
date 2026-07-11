/** A signed access/refresh token pair. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** User fields safe to expose to clients. */
export interface PublicUser {
  id: string;
  email: string;
}

/** Result of register/login: the public user plus a fresh token pair. */
export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
