import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthTokens, AuthUser } from '../data/auth.types';

export interface SessionState {
  user: AuthUser | null;
  /** Kept in memory only (re-obtained via refresh on reload). */
  accessToken: string | null;
  refreshToken: string | null;

  setSession: (user: AuthUser, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

/**
 * Client session state. The refresh token + user are persisted to localStorage
 * so a reload can restore the session; the access token stays in memory and is
 * re-minted via /auth/refresh on boot.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'reelo.session',
      partialize: (state) => ({ user: state.user, refreshToken: state.refreshToken }),
    },
  ),
);
