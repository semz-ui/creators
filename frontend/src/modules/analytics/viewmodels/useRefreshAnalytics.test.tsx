import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { server } from '@/test/msw/server';

import { analyticsKeys } from '../data/query-keys';
import { useRefreshAnalytics } from './useRefreshAnalytics';

describe('useRefreshAnalytics', () => {
  it('posts a refresh and invalidates the analytics queries', async () => {
    let refreshed = false;
    server.use(
      http.post(`${env.apiUrl}/api/v1/analytics/refresh`, () => {
        refreshed = true;
        return HttpResponse.json({ success: true, data: { synced: 2 } });
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRefreshAnalytics(), { wrapper });
    act(() => result.current.refresh());

    await waitFor(() => expect(refreshed).toBe(true));
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: analyticsKeys.all }),
    );
  });
});
