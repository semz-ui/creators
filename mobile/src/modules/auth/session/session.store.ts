import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/shared/lib/secure-storage';

import type { AuthResult, AuthTokens, AuthUser } from '../data/auth.types';

export interface SessionState {
  user: AuthUser | null;
  /** Kept in memory only (re-obtained via refresh on app launch). */
  accessToken: string | null;
  refreshToken: string | null;

  setSession: (result: AuthResult) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

/**
 * Client session state. The refresh token + user are persisted to the device
 * keychain/keystore so a relaunch can restore the session; the access token
 * stays in memory and is re-minted via /auth/refresh on boot.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: (result) =>
        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'reelo.session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user, refreshToken: state.refreshToken }),
    },
  ),
);

/**
 * Resolves once the persisted session has been read from secure storage —
 * unlike web localStorage, keychain reads are async, so boot must wait.
 */
export function waitForSessionHydration(): Promise<void> {
  if (useSessionStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useSessionStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
