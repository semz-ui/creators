import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { ok } from '@/test/msw/envelope';
import { server } from '@/test/msw/server';

import { useConnectPlatform } from './useConnectPlatform';
import { useConnections } from './useConnections';
import { useDisconnect } from './useDisconnect';
import { usePlatformRows } from './usePlatformRows';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const conn = {
  id: 'c1',
  platform: 'facebook',
  displayName: 'My Page',
  externalAccountId: 'fb_1',
  status: 'active',
  scopes: [],
  expiresAt: null,
  createdAt: '',
  updatedAt: '',
};

describe('useConnections', () => {
  it('unwraps the items array', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/connections`, () => HttpResponse.json(ok({ items: [conn] }))),
    );
    const { result } = renderHook(() => useConnections(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.platform).toBe('facebook');
  });
});

describe('usePlatformRows', () => {
  it('lists every platform, joining the active connection onto its row', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/connections`, () => HttpResponse.json(ok({ items: [conn] }))),
    );
    const { result } = renderHook(() => usePlatformRows(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.rows.map((r) => r.id)).toEqual([
      'facebook',
      'instagram',
      'youtube',
      'tiktok',
    ]);
    expect(result.current.rows[0]?.label).toBe('Facebook');
    expect(result.current.rows[0]?.connection?.displayName).toBe('My Page');
    // Unconnected platforms still get a row, with no connection.
    expect(result.current.rows[1]?.connection).toBeNull();
  });

  it('ignores connections that are not active', async () => {
    server.use(
      http.get(`${env.apiUrl}/api/v1/connections`, () =>
        HttpResponse.json(ok({ items: [{ ...conn, status: 'expired' }] })),
      ),
    );
    const { result } = renderHook(() => usePlatformRows(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.rows.every((r) => r.connection === null)).toBe(true);
  });
});

describe('useConnectPlatform', () => {
  let assignSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    assignSpy = vi.fn();
    vi.stubGlobal('location', { assign: assignSpy } as unknown as Location);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('redirects to the provider authorization URL', async () => {
    server.use(
      http.post(`${env.apiUrl}/api/v1/connections/facebook/start`, () =>
        HttpResponse.json(
          ok({ authorizationUrl: 'https://oauth.stub.local/facebook/authorize?x=1' }),
        ),
      ),
    );
    const { result } = renderHook(() => useConnectPlatform(), { wrapper });
    act(() => result.current.connect('facebook'));
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://oauth.stub.local/facebook/authorize?x=1'),
    );
  });
});

describe('useDisconnect', () => {
  it('calls DELETE for the connection', async () => {
    let deleted = false;
    server.use(
      http.delete(`${env.apiUrl}/api/v1/connections/c1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHook(() => useDisconnect(), { wrapper });
    act(() => result.current.disconnect('c1'));
    await waitFor(() => expect(deleted).toBe(true));
  });
});
