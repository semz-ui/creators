import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { useModeStore } from '@/shared/preferences/mode.store';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';

import { useSessionStore } from '../session/session.store';
import { useSession } from './useSession';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    useModeStore.getState().clear();
    localStorage.clear();
    server.use(http.post(`${env.apiUrl}/api/v1/auth/logout`, () => HttpResponse.json(ok(null))));
  });

  it('reports authentication from the refresh token', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      useSessionStore
        .getState()
        .setSession({ id: 'u1', email: 'a@b.com' }, { accessToken: 'a', refreshToken: 'r' });
    });
    rerender();

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clears the mode preference on logout so it cannot follow the next user', async () => {
    useSessionStore
      .getState()
      .setSession({ id: 'u1', email: 'a@b.com' }, { accessToken: 'a', refreshToken: 'r' });
    useModeStore.getState().setMode('assistant');

    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.logout();
    });

    expect(useSessionStore.getState().refreshToken).toBeNull();
    expect(useModeStore.getState().mode).toBeNull();
  });
});
