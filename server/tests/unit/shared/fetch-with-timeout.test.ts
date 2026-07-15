import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('fetchWithTimeout', () => {
  it('resolves with the response and forwards init plus an abort signal', async () => {
    const response = { ok: true } as Response;
    const fetchMock = jest.fn().mockResolvedValue(response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchWithTimeout('https://x.test', { method: 'POST' });

    expect(result).toBe(response);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.test');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });

  it('throws a timeout error once the request outlasts the budget', async () => {
    jest.useFakeTimers();
    // A fetch that only settles when its signal aborts.
    const fetchMock = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = fetchWithTimeout('https://x.test', {}, { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toThrow('Request timed out after 1000ms');
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('propagates non-timeout fetch errors unchanged', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(fetchWithTimeout('https://x.test')).rejects.toThrow('network down');
  });

  it('clears the timer so a completed request leaves no pending abort', async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    await fetchWithTimeout('https://x.test');

    expect(clearSpy).toHaveBeenCalled();
  });
});
