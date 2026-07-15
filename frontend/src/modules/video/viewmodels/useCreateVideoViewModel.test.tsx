import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';

import { useCreateVideoViewModel } from './useCreateVideoViewModel';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

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

const submit = { preventDefault: () => undefined } as unknown as FormEvent;

describe('useCreateVideoViewModel', () => {
  it('requires a prompt', () => {
    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    act(() => result.current.onSubmit(submit));
    expect(result.current.promptError).toBeDefined();
  });

  it('creates a video and navigates to its detail page', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/videos`, () =>
        HttpResponse.json(
          ok({ id: 'vid-1', prompt: 'a cat', durationSeconds: 15, status: 'processing' }),
          { status: 201 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    act(() => result.current.setPrompt('a cat surfing'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/videos/vid-1'));
  });

  it('shows an out-of-credits message on 402', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/videos`, () =>
        HttpResponse.json(
          { error: { code: 'INSUFFICIENT_CREDITS', message: 'no credits' } },
          { status: 402 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    act(() => result.current.setPrompt('a dog'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(result.current.formError).toMatch(/out of credits/i));
  });
});
