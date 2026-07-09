import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NARRATION_MAX } from '../data/video.types';
import { useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';
import { videoPollInterval } from '../viewmodels/useVideo';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'STATUS',
    text: async () => JSON.stringify(body),
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
  mockPush.mockClear();
});

describe('useCreateVideoViewModel', () => {
  it('requires a prompt', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreateVideoViewModel(), { wrapper });

    await act(() => result.current.onSubmit());

    expect(result.current.promptError).toMatch(/Describe the video/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an over-long narration', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreateVideoViewModel(), { wrapper });

    await act(() => {
      result.current.setPrompt('A city timelapse');
      result.current.setNarrationText('x'.repeat(NARRATION_MAX + 1));
    });
    await act(() => result.current.onSubmit());

    expect(result.current.narrationError).toMatch(/under 600/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits, nulls out unused audio fields, and navigates to the video', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(201, { id: 'v1', status: 'queued' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreateVideoViewModel(), { wrapper });

    await act(() => {
      result.current.setPrompt('  A city timelapse  ');
      result.current.setDurationSeconds(30);
    });
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/videos/v1'));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'A city timelapse',
      durationSeconds: 30,
      musicTrackId: null,
      narrationText: null,
      narrationVoice: null,
    });
    // Form resets for the next visit to the (still-mounted) Create tab.
    expect(result.current.prompt).toBe('');
  });

  it('maps a 402 to the out-of-credits message', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(402, { error: { code: 'INSUFFICIENT_CREDITS', message: 'No credits' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useCreateVideoViewModel(), { wrapper });

    await act(() => result.current.setPrompt('A city timelapse'));
    await act(() => result.current.onSubmit());

    await waitFor(() =>
      expect(result.current.formError).toBe(
        "You're out of credits. Top up to generate more videos.",
      ),
    );
  });
});

describe('videoPollInterval', () => {
  it('polls while generating and stops on terminal states', () => {
    expect(videoPollInterval('queued')).toBe(2500);
    expect(videoPollInterval('processing')).toBe(2500);
    expect(videoPollInterval('ready')).toBe(false);
    expect(videoPollInterval('failed')).toBe(false);
    expect(videoPollInterval(undefined)).toBe(false);
  });
});
