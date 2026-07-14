import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';

import { connectionKeys } from '../data/query-keys';
import { useConnectPlatform } from '../viewmodels/useConnectPlatform';
import { useDisconnect } from '../viewmodels/useDisconnect';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
}));

function jsonResponse(status: number, body: unknown) {
  const ok = status >= 200 && status < 300;
  // Mirror the server: success bodies arrive in the { success, data } envelope.
  const payload = ok ? { success: true, data: body } : body;
  return {
    ok,
    status,
    statusText: 'STATUS',
    text: async () => JSON.stringify(payload),
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

afterEach(() => {
  jest.clearAllMocks();
});

describe('useConnectPlatform', () => {
  it('opens the authorization URL in the auth browser, then refetches connections', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { authorizationUrl: 'https://accounts.google.com/auth?x=1' }),
      ) as unknown as typeof fetch;
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useConnectPlatform(), { wrapper });

    await act(() => result.current.connect('youtube'));

    await waitFor(() =>
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://accounts.google.com/auth?x=1',
      ),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: connectionKeys.all }));
    expect(result.current.pendingPlatform).toBeNull();
  });

  it('marks the pending platform while the start call is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    globalThis.fetch = jest.fn(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useConnectPlatform(), { wrapper });

    await act(() => result.current.connect('instagram'));
    expect(result.current.pendingPlatform).toBe('instagram');

    await act(async () => {
      resolveFetch(jsonResponse(200, { authorizationUrl: 'https://x' }));
    });
    await waitFor(() => expect(result.current.pendingPlatform).toBeNull());
  });
});

describe('useDisconnect', () => {
  it('deletes the connection and invalidates the list', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: async () => '',
    }) as unknown as typeof fetch;
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useDisconnect(), { wrapper });

    await act(() => result.current.disconnect('conn-1'));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: connectionKeys.all }));
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/connections/conn-1');
    expect(init.method).toBe('DELETE');
  });
});
