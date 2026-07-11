import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter, useLocation, type Location } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useResetPasswordViewModel } from './useResetPasswordViewModel';

let lastLocation: Location | null = null;

/** Records the router location so tests can assert post-success navigation. */
function LocationSpy() {
  lastLocation = useLocation();
  return null;
}

function makeWrapper(initialEntry: string) {
  lastLocation = null;
  return function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[initialEntry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <LocationSpy />
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const submitEvent = { preventDefault: () => undefined } as unknown as FormEvent;

describe('useResetPasswordViewModel', () => {
  it('validates the new password before calling the API', () => {
    let requests = 0;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/reset-password`, () => {
        requests += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useResetPasswordViewModel(), {
      wrapper: makeWrapper('/reset-password?token=tok-1'),
    });
    act(() => result.current.setPassword('short'));
    act(() => result.current.onSubmit(submitEvent));

    expect(result.current.fieldErrors.password).toBeDefined();
    expect(requests).toBe(0);
  });

  it('flags a missing token and never submits', () => {
    let requests = 0;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/reset-password`, () => {
        requests += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useResetPasswordViewModel(), {
      wrapper: makeWrapper('/reset-password'),
    });

    expect(result.current.isTokenMissing).toBe(true);

    act(() => result.current.setPassword('brand-new-pass-1'));
    act(() => result.current.onSubmit(submitEvent));
    expect(requests).toBe(0);
  });

  it('navigates to /login with a notice on success', async () => {
    server.use(
      http.post(
        `${env.apiUrl}/api/v1/auth/reset-password`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const { result } = renderHook(() => useResetPasswordViewModel(), {
      wrapper: makeWrapper('/reset-password?token=tok-1'),
    });
    act(() => result.current.setPassword('brand-new-pass-1'));
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(lastLocation?.pathname).toBe('/login'));
    expect((lastLocation?.state as { notice?: string })?.notice).toMatch(
      /password has been reset/i,
    );
  });

  it('maps a 401 to an invalid-link error', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/reset-password`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired reset token' } },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useResetPasswordViewModel(), {
      wrapper: makeWrapper('/reset-password?token=used-token'),
    });
    act(() => result.current.setPassword('brand-new-pass-1'));
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(result.current.formError).toMatch(/invalid or has expired/i));
    expect(result.current.isTokenError).toBe(true);
  });

  it('maps a 422 to a password-policy error', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/reset-password`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'weak' } },
          { status: 422 },
        ),
      ),
    );

    const { result } = renderHook(() => useResetPasswordViewModel(), {
      wrapper: makeWrapper('/reset-password?token=tok-1'),
    });
    act(() => result.current.setPassword('valid-client-side-pass'));
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(result.current.formError).toMatch(/between 8 and 72/i));
    expect(result.current.isTokenError).toBe(false);
  });
});
