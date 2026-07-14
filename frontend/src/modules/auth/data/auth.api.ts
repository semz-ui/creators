import { apiClient } from '@/shared/data/api-client';

import type {
  AuthResult,
  AuthTokens,
  AuthUser,
  ForgotPasswordInput,
  ForgotPasswordResult,
  GoogleSignInInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.types';

const BASE = '/api/v1/auth';

/** Auth endpoints. The data layer is the only place that talks to the network. */
export const authApi = {
  register: (input: RegisterInput) =>
    apiClient.post<AuthResult>(`${BASE}/register`, input, { auth: false }),

  login: (input: LoginInput) => apiClient.post<AuthResult>(`${BASE}/login`, input, { auth: false }),

  /** Exchange a verified Google ID token for a Reelo session. */
  googleSignIn: (input: GoogleSignInInput) =>
    apiClient.post<AuthResult>(`${BASE}/google`, input, { auth: false }),

  /** Rotate tokens. Sent without a Bearer header to avoid refresh recursion. */
  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>(`${BASE}/refresh`, { refreshToken }, { auth: false }),

  logout: (refreshToken: string) =>
    apiClient.post<void>(`${BASE}/logout`, { refreshToken }, { auth: false }),

  /** Always 202 with a generic message, whether or not the account exists. */
  forgotPassword: (input: ForgotPasswordInput) =>
    apiClient.post<ForgotPasswordResult>(`${BASE}/forgot-password`, input, { auth: false }),

  resetPassword: (input: ResetPasswordInput) =>
    apiClient.post<void>(`${BASE}/reset-password`, input, { auth: false }),

  me: () => apiClient.get<AuthUser>(`${BASE}/me`),
};
