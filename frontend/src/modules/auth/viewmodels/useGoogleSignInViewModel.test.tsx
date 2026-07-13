import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useSessionStore } from '../session/session.store';
import { useGoogleSignInViewModel } from './useGoogleSignInViewModel';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useGoogleSignInViewModel', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it('is in stub mode when no Google client ID is configured', () => {
    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    expect(result.current.mode).toBe('stub');
  });

  it('posts the ID token and stores the session on success', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/google`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          user: { id: 'u1', email: 'google.user@reelo.local' },
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
        });
      }),
    );

    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    act(() => result.current.signInWithIdToken('id-token-1'));

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe('access-1'));
    expect(useSessionStore.getState().user).toEqual({ id: 'u1', email: 'google.user@reelo.local' });
    expect(body).toEqual({ idToken: 'id-token-1' });
  });

  it('sends a stub-google token from the stub button', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/google`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          user: { id: 'u1', email: 'google.user@reelo.local' },
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
        });
      }),
    );

    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    act(() => result.current.signInWithStub());

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe('access-1'));
    expect(body).toEqual({ idToken: expect.stringMatching(/^stub-google:/) });
  });

  it('surfaces the server message on 401', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/google`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Google account email is not verified' } },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    act(() => result.current.signInWithIdToken('id-token-1'));

    await waitFor(() => expect(result.current.formError).toMatch(/not verified/i));
    expect(useSessionStore.getState().accessToken).toBeNull();
  });
});
