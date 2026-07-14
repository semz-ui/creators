import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useForgotPasswordViewModel } from './useForgotPasswordViewModel';

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

const submitEvent = { preventDefault: () => undefined } as unknown as FormEvent;

describe('useForgotPasswordViewModel', () => {
  it('validates the email before calling the API', () => {
    let requests = 0;
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/forgot-password`, () => {
        requests += 1;
        return HttpResponse.json({ success: true, data: { message: 'sent' } }, { status: 202 });
      }),
    );

    const { result } = renderHook(() => useForgotPasswordViewModel(), { wrapper });
    act(() => result.current.setEmail('not-an-email'));
    act(() => result.current.onSubmit(submitEvent));

    expect(result.current.fieldErrors.email).toBeDefined();
    expect(requests).toBe(0);
  });

  it('shows the server message after a 202', async () => {
    const message = 'If an account exists for that email, a password reset link has been sent.';
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/forgot-password`, () =>
        HttpResponse.json({ success: true, data: { message } }, { status: 202 }),
      ),
    );

    const { result } = renderHook(() => useForgotPasswordViewModel(), { wrapper });
    act(() => result.current.setEmail('someone@reelo.app'));
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(result.current.isSubmitted).toBe(true));
    expect(result.current.successMessage).toBe(message);
  });

  it('maps a 429 to a rate-limit message', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/forgot-password`, () =>
        HttpResponse.json(
          { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } },
          { status: 429 },
        ),
      ),
    );

    const { result } = renderHook(() => useForgotPasswordViewModel(), { wrapper });
    act(() => result.current.setEmail('someone@reelo.app'));
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(result.current.formError).toMatch(/too many requests/i));
    expect(result.current.isSubmitted).toBe(false);
  });
});
