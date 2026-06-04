import { apiClient } from '@/shared/data/api-client';

import { authApi } from '../data/auth.api';
import { useSessionStore } from './session.store';

let configured = false;

/**
 * Wire the API client to the session store: it reads the access token, and on a
 * 401 refreshes (rotating) the tokens then retries. On refresh failure the
 * session is cleared. Call once at app start.
 */
export function configureAuth(): void {
  if (configured) return;
  configured = true;

  apiClient.configure({
    getToken: () => useSessionStore.getState().accessToken,
    refresh: async () => {
      const { refreshToken, setTokens, clear } = useSessionStore.getState();
      if (!refreshToken) return false;
      try {
        const tokens = await authApi.refresh(refreshToken);
        setTokens(tokens);
        return true;
      } catch {
        clear();
        return false;
      }
    },
  });
}

/**
 * Restore the session on boot: if a refresh token was persisted, mint a fresh
 * access token and load the current user. Resolves to whether a session was
 * restored.
 */
export async function restoreSession(): Promise<boolean> {
  const { refreshToken, setTokens, setUser, clear } = useSessionStore.getState();
  if (!refreshToken) return false;

  try {
    const tokens = await authApi.refresh(refreshToken);
    setTokens(tokens);
    const user = await authApi.me();
    setUser(user);
    return true;
  } catch {
    clear();
    return false;
  }
}
