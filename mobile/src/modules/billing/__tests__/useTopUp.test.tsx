import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';

import { billingKeys } from '../data/query-keys';
import { CREDIT_PACKS, useTopUp } from '../viewmodels/useTopUp';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'STATUS',
    text: async () => JSON.stringify(body),
  };
}

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
});

afterEach(() => jest.clearAllMocks());

describe('useTopUp', () => {
  it('defaults to the middle pack', async () => {
    const { result } = await renderHook(() => useTopUp(), { wrapper });
    expect(result.current.credits).toBe(CREDIT_PACKS[1]);
  });

  it('requests a checkout session, opens it, and refetches billing data', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { paymentId: 'pay-1', checkoutUrl: 'https://checkout.stripe.com/x' }),
      ) as unknown as typeof fetch;
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useTopUp(), { wrapper });

    await act(() => result.current.setCredits(250));
    await act(() => result.current.buy());

    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.stripe.com/x'),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: billingKeys.all }));

    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/billing/topup');
    expect(JSON.parse(init.body as string)).toEqual({ credits: 250 });
  });

  it('flags an error when checkout cannot start', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(500, { error: { code: 'ERROR', message: 'Provider down' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useTopUp(), { wrapper });

    await act(() => result.current.buy());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });
});
