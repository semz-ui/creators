import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from './api-client';
import { HttpError } from './http-error';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('GETs and parses JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient('http://api.test');
    await expect(client.get('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the Bearer token from the configured getter', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok-123', refresh: async () => false });
    await client.get('/me');

    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
  });

  it('throws an HttpError carrying the error envelope', async () => {
    // Fresh Response per call (a Response body can only be read once).
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ error: { code: 'NOT_FOUND', message: 'nope' } }, 404)),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient('http://api.test');
    const error = await client.get('/missing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'nope' });
  });

  it('refreshes once on 401 then retries the request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { value: 'after-refresh' } }));
    vi.stubGlobal('fetch', fetchMock);

    const refresh = vi.fn().mockResolvedValue(true);
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok', refresh });

    await expect(client.get('/secure')).resolves.toEqual({ value: 'after-refresh' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry more than once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401));
    vi.stubGlobal('fetch', fetchMock);

    const refresh = vi.fn().mockResolvedValue(true);
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok', refresh });

    await expect(client.get('/secure')).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // original + one retry
  });
});
