import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useSessionStore } from '../session/session.store';
import { useRegisterViewModel } from './useRegisterViewModel';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const submitEvent = { preventDefault: () => undefined } as unknown as FormEvent;

describe('useRegisterViewModel', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it('validates before calling the API', () => {
    const { result } = renderHook(() => useRegisterViewModel(), { wrapper });

    act(() => {
      result.current.setEmail('not-an-email');
      result.current.setPassword('short');
    });
    act(() => result.current.onSubmit(submitEvent));

    expect(result.current.fieldErrors.email).toBeDefined();
    expect(result.current.fieldErrors.password).toBeDefined();
  });

  it('registers and stores the session on success', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/register`, () =>
        HttpResponse.json(
          {
            user: { id: 'u1', email: 'new@reelo.app' },
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
          },
          { status: 201 },
        ),
      ),
    );

    const { result } = renderHook(() => useRegisterViewModel(), { wrapper });
    act(() => {
      result.current.setEmail('new@reelo.app');
      result.current.setPassword('password123');
    });
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe('access-1'));
    expect(useSessionStore.getState().user).toEqual({ id: 'u1', email: 'new@reelo.app' });
  });

  it('surfaces a friendly error on duplicate email (409)', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/auth/register`, () =>
        HttpResponse.json({ error: { code: 'CONFLICT', message: 'exists' } }, { status: 409 }),
      ),
    );

    const { result } = renderHook(() => useRegisterViewModel(), { wrapper });
    act(() => {
      result.current.setEmail('dupe@reelo.app');
      result.current.setPassword('password123');
    });
    act(() => result.current.onSubmit(submitEvent));

    await waitFor(() => expect(result.current.formError).toMatch(/already exists/i));
    expect(useSessionStore.getState().accessToken).toBeNull();
  });
});
