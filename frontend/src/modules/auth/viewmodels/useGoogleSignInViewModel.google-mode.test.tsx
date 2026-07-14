import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { renderGoogleButton } from '../data/google-identity';
import { useSessionStore } from '../session/session.store';
import { useGoogleSignInViewModel } from './useGoogleSignInViewModel';

// Exercise mode === 'google': a configured client ID (never set in the real
// Vitest env, hence this mock) and a mocked GIS wrapper. Stub mode is covered
// in useGoogleSignInViewModel.test.tsx.
vi.mock('@/shared/config/env', () => ({
  env: { apiUrl: 'http://localhost:4000', googleClientId: 'client-123' },
  isDevelopment: true,
}));
vi.mock('../data/google-identity', () => ({ renderGoogleButton: vi.fn() }));

const renderGoogleButtonMock = vi.mocked(renderGoogleButton);

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

describe('useGoogleSignInViewModel (google mode)', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
    renderGoogleButtonMock.mockReset();
  });

  it('renders the GIS button into the mounted container', () => {
    renderGoogleButtonMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    expect(result.current.mode).toBe('google');

    const container = document.createElement('div');
    act(() => result.current.mountGoogleButton(container));

    expect(renderGoogleButtonMock).toHaveBeenCalledWith(
      container,
      'client-123',
      expect.any(Function),
    );
  });

  it('signs in with the ID token delivered by the GIS callback', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/google`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            user: { id: 'u1', email: 'google.user@reelo.app' },
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
          },
        });
      }),
    );
    renderGoogleButtonMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    act(() => result.current.mountGoogleButton(document.createElement('div')));

    const onIdToken = renderGoogleButtonMock.mock.calls[0]?.[2];
    expect(onIdToken).toBeDefined();
    act(() => onIdToken?.('google-id-token'));

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe('access-1'));
    expect(body).toEqual({ idToken: 'google-id-token' });
  });

  it('sets loadError when the GIS script fails and clears it on a successful retry', async () => {
    renderGoogleButtonMock.mockRejectedValueOnce(new Error('blocked'));

    const { result } = renderHook(() => useGoogleSignInViewModel(), { wrapper });
    act(() => result.current.mountGoogleButton(document.createElement('div')));

    await waitFor(() => expect(result.current.loadError).toBe(true));

    renderGoogleButtonMock.mockResolvedValueOnce(undefined);
    act(() => result.current.retryGoogleButton());

    expect(renderGoogleButtonMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.loadError).toBe(false));
  });
});
