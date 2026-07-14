import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSessionStore } from '../session/session.store';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
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
  // gcTime 0 so no cache-eviction timers outlive the test run.
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
  useSessionStore.getState().clear();
});

describe('useRegisterViewModel', () => {
  it('blocks submission on invalid fields without calling the API', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useRegisterViewModel(), { wrapper });

    await act(() => {
      result.current.setEmail('not-an-email');
      result.current.setPassword('short');
    });
    await act(() => result.current.onSubmit());

    expect(result.current.fieldErrors.email).toMatch(/valid email/);
    expect(result.current.fieldErrors.password).toMatch(/at least 8/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores the session and navigates home on success', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      jsonResponse(201, {
        user: { id: 'u1', email: 'a@b.co' },
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
    ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useRegisterViewModel(), { wrapper });

    await act(() => {
      result.current.setEmail('a@b.co');
      result.current.setPassword('long-enough-password');
    });
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)/home'));
    expect(useSessionStore.getState().refreshToken).toBe('refresh-1');
  });

  it('maps a 409 to a friendly duplicate-account message', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(409, { error: { code: 'CONFLICT', message: 'Email taken' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useRegisterViewModel(), { wrapper });

    await act(() => {
      result.current.setEmail('a@b.co');
      result.current.setPassword('long-enough-password');
    });
    await act(() => result.current.onSubmit());

    await waitFor(() =>
      expect(result.current.formError).toBe('An account with this email already exists.'),
    );
  });
});

describe('useLoginViewModel', () => {
  it('maps a 401 to an invalid-credentials message', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Bad credentials' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useLoginViewModel(), { wrapper });

    await act(() => {
      result.current.setEmail('a@b.co');
      result.current.setPassword('whatever');
    });
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(result.current.formError).toBe('Invalid email or password.'));
  });
});
