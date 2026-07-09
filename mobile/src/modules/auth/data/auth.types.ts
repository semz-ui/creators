export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
