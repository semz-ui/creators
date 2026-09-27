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

/**
 * The default MSW handler reports sora available (audio), kling unavailable,
 * and pika available (no audio).
 */
describe('useCreateVideoViewModel provider selection', () => {
  it('defaults to the first available provider once they load', async () => {
    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });

    await waitFor(() => expect(result.current.provider).toBe('sora'));
    expect(result.current.supportsAudio).toBe(true);
  });

  it('reports when the selected provider cannot take added audio', async () => {
    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    await waitFor(() => expect(result.current.providers).toHaveLength(3));

    act(() => result.current.selectProvider('pika'));

    expect(result.current.provider).toBe('pika');
    expect(result.current.supportsAudio).toBe(false);
  });

  it('clears audio settings when switching to a provider that ignores them', async () => {
    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    await waitFor(() => expect(result.current.providers).toHaveLength(3));

    act(() => {
      result.current.setMusicTrackId('lofi');
      result.current.setNarrationText('hello there');
    });
    expect(result.current.musicTrackId).toBe('lofi');

    act(() => result.current.selectProvider('pika'));

    // Otherwise a disabled control would still submit a value the server drops.
    expect(result.current.musicTrackId).toBe('');
    expect(result.current.narrationText).toBe('');
  });

  it('submits the selected provider', async () => {
    let body: { provider?: string } = {};
    server.use(
      http.post(`${env.apiUrl}/api/v1/videos`, async ({ request }) => {
        body = (await request.json()) as { provider?: string };
        return HttpResponse.json(ok({ id: 'vid-2', status: 'processing' }), { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCreateVideoViewModel(), { wrapper });
    await waitFor(() => expect(result.current.providers).toHaveLength(3));

    act(() => result.current.selectProvider('pika'));
    act(() => result.current.setPrompt('a neon skyline'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(body.provider).toBe('pika'));
  });
});
