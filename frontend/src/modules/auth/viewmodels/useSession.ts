import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useModeStore } from '@/shared/preferences/mode.store';

import { authApi } from '../data/auth.api';
import { useSessionStore } from '../session/session.store';

/** Session view-model: current user + auth status + logout. */
export function useSession() {
  const user = useSessionStore((s) => s.user);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clear = useSessionStore((s) => s.clear);
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    const token = useSessionStore.getState().refreshToken;
    if (token) {
      // Best-effort server-side revocation; clear locally regardless.
      await authApi.logout(token).catch(() => undefined);
    }
    clear();
    queryClient.clear();
    // The mode preference is not user-scoped, so it must not outlive the
    // session — otherwise the next person to sign in inherits this choice.
    useModeStore.getState().clear();
  }, [clear, queryClient]);

  return {
    user,
    isAuthenticated: Boolean(refreshToken),
    logout,
  };
}
