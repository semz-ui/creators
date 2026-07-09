import { ApiClient } from '../api-client';
import { HttpError } from '../http-error';

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'STATUS',
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function mockFetch(...responses: ReturnType<typeof jsonResponse>[]) {
  const fn = jest.fn();
  for (const res of responses) fn.mockResolvedValueOnce(res);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

describe('ApiClient', () => {
  it('attaches the bearer token to authenticated requests', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { ok: true }));
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok-1', refresh: async () => false });

    await client.get('/thing');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/thing');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('skips the token for auth:false requests', async () => {
    const fetchMock = mockFetch(jsonResponse(200, {}));
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok-1', refresh: async () => false });

    await client.post('/auth/login', { email: 'a@b.co' }, { auth: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.co' }));
  });

  it('refreshes once on a 401 and retries the request', async () => {
    const fetchMock = mockFetch(jsonResponse(401), jsonResponse(200, { value: 42 }));
    let token = 'stale';
    const refresh = jest.fn(async () => {
      token = 'fresh';
      return true;
    });
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => token, refresh });

    const result = await client.get<{ value: number }>('/thing');

    expect(result).toEqual({ value: 42 });
    expect(refresh).toHaveBeenCalledTimes(1);
    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh');
  });

  it('does not retry more than once after a refresh', async () => {
    const fetchMock = mockFetch(
      jsonResponse(401),
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Nope' } }),
    );
    const refresh = jest.fn(async () => true);
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok', refresh });

    await expect(client.get('/thing')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when the refresh fails', async () => {
    mockFetch(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Expired' } }));
    const client = new ApiClient('http://api.test');
    client.configure({ getToken: () => 'tok', refresh: async () => false });

    await expect(client.get('/thing')).rejects.toBeInstanceOf(HttpError);
  });

  it('maps the API error envelope onto HttpError', async () => {
    mockFetch(
      jsonResponse(402, { error: { code: 'INSUFFICIENT_CREDITS', message: 'Out of credits' } }),
    );
    const client = new ApiClient('http://api.test');

    const error = await client.get('/videos').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 402,
      code: 'INSUFFICIENT_CREDITS',
      message: 'Out of credits',
    });
  });
});
