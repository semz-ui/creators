import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { useTopUp } from './useTopUp';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useTopUp', () => {
  let assignSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    assignSpy = vi.fn();
    vi.stubGlobal('location', { assign: assignSpy } as unknown as Location);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts checkout with the selected pack and redirects', async () => {
    let body: unknown;
    server.use(
      http.post(`${env.apiUrl}/api/v1/billing/topup`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          data: { paymentId: 'p1', checkoutUrl: 'https://pay.stub/checkout/p1' },
        });
      }),
    );

    const { result } = renderHook(() => useTopUp(), { wrapper });
    act(() => result.current.setCredits(250));
    act(() => result.current.buy());

    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('https://pay.stub/checkout/p1'));
    expect(body).toEqual({ credits: 250 });
  });
});
