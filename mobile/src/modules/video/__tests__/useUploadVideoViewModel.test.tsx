import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { ReactNode } from 'react';

import { MAX_UPLOAD_BYTES } from '../data/video.types';
import { useUploadVideoViewModel } from '../viewmodels/useUploadVideoViewModel';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-document-picker');
const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;

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

describe('useUploadVideoViewModel', () => {
  it('requires a title', async () => {
    const { result } = await renderHook(() => useUploadVideoViewModel(), { wrapper });

    await act(() => result.current.onSubmit());

    expect(result.current.titleError).toMatch(/title/i);
  });

  it('requires a file', async () => {
    const { result } = await renderHook(() => useUploadVideoViewModel(), { wrapper });

    await act(() => result.current.setTitle('My video'));
    await act(() => result.current.onSubmit());

    expect(result.current.fileError).toMatch(/Select a video/);
  });

  it('rejects oversized files from the picker', async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///big.mp4',
          mimeType: 'video/mp4',
          name: 'big.mp4',
          size: MAX_UPLOAD_BYTES + 1,
        },
      ],
    });

    const { result } = await renderHook(() => useUploadVideoViewModel(), { wrapper });

    await act(() => result.current.pickFile());

    expect(result.current.fileError).toMatch(/under 500/);
    expect(result.current.file).toBeNull();
  });

  it('picks a valid file successfully', async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///video.mp4',
          mimeType: 'video/mp4',
          name: 'video.mp4',
          size: 1024 * 1024,
        },
      ],
    });

    const { result } = await renderHook(() => useUploadVideoViewModel(), { wrapper });

    await act(() => result.current.pickFile());

    expect(result.current.file).not.toBeNull();
    expect(result.current.file!.fileName).toBe('video.mp4');
    expect(result.current.fileError).toBeUndefined();
  });

  it('uploads and navigates on success', async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///video.mp4',
          mimeType: 'video/mp4',
          name: 'video.mp4',
          size: 1024,
        },
      ],
    });

    const xhrSend = jest.fn();
    const xhrOpen = jest.fn();
    const xhrSetHeader = jest.fn();
    const MockXHR = jest.fn(() => ({
      open: xhrOpen,
      setRequestHeader: xhrSetHeader,
      send: xhrSend,
      upload: { onprogress: null },
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      status: 201,
      responseText: JSON.stringify({ id: 'vid-up-1', status: 'ready', source: 'uploaded' }),
    }));
    globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;

    const { result } = await renderHook(() => useUploadVideoViewModel(), { wrapper });

    await act(() => result.current.pickFile());
    await act(() => result.current.setTitle('Test upload'));
    await act(() => result.current.onSubmit());

    // Simulate XHR completing
    const instance = MockXHR.mock.results[0]!.value;
    await act(() => {
      instance.onload!();
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/videos/vid-up-1'));
  });
});
