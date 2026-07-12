import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel';
import { useResetPasswordViewModel } from '../viewmodels/useResetPasswordViewModel';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'STATUS',
    text: async () => JSON.stringify(body),
  };
}

function emptyResponse(status: number) {
  return { ok: status >= 200 && status < 300, status, statusText: 'STATUS', text: async () => '' };
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
  mockParams = {};
});

describe('useForgotPasswordViewModel', () => {
  it('blocks submission on an invalid email without calling the API', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useForgotPasswordViewModel(), { wrapper });

    await act(() => result.current.setEmail('not-an-email'));
    await act(() => result.current.onSubmit());

    expect(result.current.fieldErrors.email).toMatch(/valid email/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the server message after a 202', async () => {
    const message = 'If an account exists for that email, a password reset link has been sent.';
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(202, { message })) as unknown as typeof fetch;
    const { result } = await renderHook(() => useForgotPasswordViewModel(), { wrapper });

    await act(() => result.current.setEmail('someone@reelo.app'));
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(result.current.isSubmitted).toBe(true));
    expect(result.current.successMessage).toBe(message);
  });

  it('maps a 429 to a rate-limit message', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useForgotPasswordViewModel(), { wrapper });

    await act(() => result.current.setEmail('someone@reelo.app'));
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(result.current.formError).toMatch(/too many requests/i));
  });
});

describe('useResetPasswordViewModel', () => {
  it('blocks submission on a short password without calling the API', async () => {
    mockParams = { token: 'tok-1' };
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useResetPasswordViewModel(), { wrapper });

    await act(() => result.current.setPassword('short'));
    await act(() => result.current.onSubmit());

    expect(result.current.fieldErrors.password).toMatch(/at least 8/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags a missing token and never submits', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = await renderHook(() => useResetPasswordViewModel(), { wrapper });

    expect(result.current.isTokenMissing).toBe(true);

    await act(() => result.current.setPassword('brand-new-pass-1'));
    await act(() => result.current.onSubmit());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('navigates to login with a notice on success', async () => {
    mockParams = { token: 'tok-1' };
    globalThis.fetch = jest.fn().mockResolvedValue(emptyResponse(204)) as unknown as typeof fetch;
    const { result } = await renderHook(() => useResetPasswordViewModel(), { wrapper });

    await act(() => result.current.setPassword('brand-new-pass-1'));
    await act(() => result.current.onSubmit());

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/login',
        params: { notice: expect.stringMatching(/password has been reset/i) },
      }),
    );
  });

  it('maps a 401 to an invalid-link error', async () => {
    mockParams = { token: 'used-token' };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useResetPasswordViewModel(), { wrapper });

    await act(() => result.current.setPassword('brand-new-pass-1'));
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(result.current.formError).toMatch(/invalid or has expired/i));
    expect(result.current.isTokenError).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('maps a 422 to a password-policy error', async () => {
    mockParams = { token: 'tok-1' };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(422, { error: { code: 'VALIDATION_ERROR', message: 'weak' } }),
      ) as unknown as typeof fetch;
    const { result } = await renderHook(() => useResetPasswordViewModel(), { wrapper });

    await act(() => result.current.setPassword('valid-client-side-pass'));
    await act(() => result.current.onSubmit());

    await waitFor(() => expect(result.current.formError).toMatch(/between 8 and 72/i));
    expect(result.current.isTokenError).toBe(false);
  });
});
