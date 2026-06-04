import { apiClient } from '@/shared/data/api-client';

import type { AuthResult, AuthTokens, AuthUser, LoginInput, RegisterInput } from './auth.types';

const BASE = '/api/v1/auth';

/** Auth endpoints. The data layer is the only place that talks to the network. */
export const authApi = {
  register: (input: RegisterInput) =>
    apiClient.post<AuthResult>(`${BASE}/register`, input, { auth: false }),

  login: (input: LoginInput) => apiClient.post<AuthResult>(`${BASE}/login`, input, { auth: false }),

  /** Rotate tokens. Sent without a Bearer header to avoid refresh recursion. */
  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>(`${BASE}/refresh`, { refreshToken }, { auth: false }),

  logout: (refreshToken: string) =>
    apiClient.post<void>(`${BASE}/logout`, { refreshToken }, { auth: false }),

  me: () => apiClient.get<AuthUser>(`${BASE}/me`),
};
