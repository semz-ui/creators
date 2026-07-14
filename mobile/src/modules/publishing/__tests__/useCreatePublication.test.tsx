import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCreatePublication } from '../viewmodels/useCreatePublication';
import { publicationPollInterval } from '../viewmodels/usePublication';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useFocusEffect: jest.fn(),
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

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  jest.restoreAllMocks();
  mockReplace.mockClear();
});

describe('useCreatePublication', () => {
  it('requires at least one platform', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreatePublication('v1'), { wrapper });

    await act(() => result.current.onSubmit());

    expect(result.current.formError).toBe('Pick at least one platform.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a past schedule time', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreatePublication('v1'), { wrapper });

    await act(() => {
      result.current.togglePlatform('youtube');
      result.current.setSchedule('later');
      result.current.setScheduledAt(new Date(Date.now() - 60_000).toISOString());
    });
    await act(() => result.current.onSubmit());

    expect(result.current.formError).toBe('Choose a date and time in the future.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('publishes now with trimmed caption and navigates to the publication', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(201, { id: 'pub-1', status: 'publishing' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreatePublication('v1'), { wrapper });

    await act(() => {
      result.current.togglePlatform('youtube');
      result.current.togglePlatform('instagram');
      result.current.setCaption('  My first reel  ');
    });
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/publications/pub-1'));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      videoId: 'v1',
      platforms: ['youtube', 'instagram'],
      caption: 'My first reel',
    });
  });

  it('sends a future schedule as ISO', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(201, { id: 'pub-2', status: 'scheduled' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const { result } = await renderHook(() => useCreatePublication('v1'), { wrapper });

    await act(() => {
      result.current.togglePlatform('tiktok');
      result.current.setSchedule('later');
      result.current.setScheduledAt(future.toISOString());
    });
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      videoId: 'v1',
      platforms: ['tiktok'],
      scheduledAt: future.toISOString(),
    });
  });
});

describe('publicationPollInterval', () => {
  it('polls only while publishing', () => {
    expect(publicationPollInterval('publishing')).toBe(2500);
    expect(publicationPollInterval('scheduled')).toBe(false);
    expect(publicationPollInterval('completed')).toBe(false);
    expect(publicationPollInterval('partially_failed')).toBe(false);
    expect(publicationPollInterval('failed')).toBe(false);
    expect(publicationPollInterval(undefined)).toBe(false);
  });
});
