import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { FormEvent, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useCreatePublication } from './useCreatePublication';

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

describe('useCreatePublication', () => {
  it('requires at least one platform', () => {
    const { result } = renderHook(() => useCreatePublication('vid-1'), { wrapper });
    act(() => result.current.onSubmit(submit));
    expect(result.current.formError).toMatch(/at least one platform/i);
  });

  it('requires a future time when scheduling', () => {
    const { result } = renderHook(() => useCreatePublication('vid-1'), { wrapper });
    act(() => result.current.togglePlatform('facebook'));
    act(() => result.current.setSchedule('later'));
    act(() => result.current.onSubmit(submit));
    expect(result.current.formError).toMatch(/future/i);
  });

  it('publishes immediately and navigates to the publication', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/publications`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { success: true, data: { id: 'pub-1', status: 'completed', targets: [] } },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(() => useCreatePublication('vid-1'), { wrapper });
    act(() => result.current.togglePlatform('facebook'));
    act(() => result.current.setCaption('check it out'));
    act(() => result.current.onSubmit(submit));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/publications/pub-1'));
    expect(body).toMatchObject({
      videoId: 'vid-1',
      platforms: ['facebook'],
      caption: 'check it out',
    });
    expect(body).not.toHaveProperty('scheduledAt');
  });
});
