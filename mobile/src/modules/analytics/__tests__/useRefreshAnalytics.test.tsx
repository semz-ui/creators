import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { analyticsKeys } from '../data/query-keys';
import { useRefreshAnalytics } from '../viewmodels/useRefreshAnalytics';

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

afterEach(() => jest.restoreAllMocks());

describe('useRefreshAnalytics', () => {
  it('POSTs the refresh and invalidates all analytics queries', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ synced: 3 }),
    }) as unknown as typeof fetch;
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useRefreshAnalytics(), { wrapper });

    await act(() => result.current.refresh());

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: analyticsKeys.all }));
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/analytics/refresh');
    expect(init.method).toBe('POST');
  });
});
