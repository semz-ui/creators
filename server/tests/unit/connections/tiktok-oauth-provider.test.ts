import {
  TikTokOAuthProvider,
  TIKTOK_SCOPES,
  type TikTokOAuthConfig,
} from '@modules/connections/infrastructure/tiktok-oauth-provider';

const CONFIG: TikTokOAuthConfig = { clientKey: 'tt-client-key', clientSecret: 'tt-client-secret' };
const REDIRECT_URI = 'http://localhost:4000/api/v1/connections/callback';

const TOKEN_RESPONSE = {
  access_token: 'tt-access',
  open_id: 'open-id-123',
  refresh_token: 'tt-refresh',
  expires_in: 86400,
  scope: 'user.info.basic,video.publish',
  token_type: 'Bearer',
};
const USER_INFO_RESPONSE = { data: { user: { open_id: 'open-id-123', display_name: 'reelo.tt' } } };

/** Build a fetch mock returning the given JSON bodies, one per call. */
function mockFetch(...responses: { ok?: boolean; status?: number; json: unknown }[]) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      statusText: 'OK',
      json: async () => res.json,
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

const exchange = () =>
  new TikTokOAuthProvider(CONFIG).exchangeCode({ code: 'code-1', redirectUri: REDIRECT_URI });

describe('TikTokOAuthProvider.getAuthorizationUrl', () => {
  it('builds the consent URL with client_key and comma-separated scopes', () => {
    const url = new URL(
      new TikTokOAuthProvider(CONFIG).getAuthorizationUrl({
        state: 'state-1',
        redirectUri: REDIRECT_URI,
      }),
    );

    expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');
    // TikTok uses client_key, not client_id.
    expect(url.searchParams.get('client_key')).toBe('tt-client-key');
    expect(url.searchParams.get('client_id')).toBeNull();
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('scope')).toBe('user.info.basic,video.publish');
  });
});

describe('TikTokOAuthProvider.exchangeCode', () => {
  it('exchanges the code and resolves the account identity', async () => {
    const fetchMock = mockFetch({ json: TOKEN_RESPONSE }, { json: USER_INFO_RESPONSE });
    const before = Date.now();

    const account = await exchange();

    expect(account.externalAccountId).toBe('open-id-123');
    expect(account.displayName).toBe('reelo.tt');
    expect(account.accessToken).toBe('tt-access');
    expect(account.refreshToken).toBe('tt-refresh');
    expect(account.scopes).toEqual(['user.info.basic', 'video.publish']);
    expect(account.expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 86400 * 1000);
    expect(account.expiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + 86400 * 1000);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tokenUrl).toBe('https://open.tiktokapis.com/v2/oauth/token/');
    expect(tokenInit.method).toBe('POST');
    expect((tokenInit.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    const body = new URLSearchParams(tokenInit.body as string);
    expect(body.get('client_key')).toBe('tt-client-key');
    expect(body.get('client_secret')).toBe('tt-client-secret');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(body.get('code')).toBe('code-1');

    const [infoUrl, infoInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(infoUrl).toBe('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name');
    expect((infoInit.headers as Record<string, string>).Authorization).toBe('Bearer tt-access');
  });

  it('surfaces the top-level OAuth error shape', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Authorization code is invalid' },
    });
    await expect(exchange()).rejects.toThrow(
      /TikTok token request failed \(HTTP 400\).*invalid_grant — Authorization code is invalid/,
    );
  });

  it('surfaces the nested open-API error shape on the user info lookup', async () => {
    mockFetch(
      { json: TOKEN_RESPONSE },
      {
        ok: false,
        status: 401,
        json: { error: { code: 'access_token_invalid', message: 'Invalid access token' } },
      },
    );
    await expect(exchange()).rejects.toThrow(
      /TikTok user info lookup failed \(HTTP 401\).*Invalid access token/,
    );
  });

  it('defaults the display name when the field is missing', async () => {
    mockFetch({ json: TOKEN_RESPONSE }, { json: { data: { user: {} } } });
    const account = await exchange();
    expect(account.displayName).toBe('TikTok account');
  });

  it('falls back to the default scopes when scope is absent', async () => {
    mockFetch({ json: { ...TOKEN_RESPONSE, scope: undefined } }, { json: USER_INFO_RESPONSE });
    const account = await exchange();
    expect(account.scopes).toEqual(TIKTOK_SCOPES);
  });
});

describe('TikTokOAuthProvider.refreshAccessToken', () => {
  const refresh = () => new TikTokOAuthProvider(CONFIG).refreshAccessToken('old-refresh');

  it('refreshes and rotates the refresh token', async () => {
    const fetchMock = mockFetch({
      json: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 86400 },
    });

    const tokens = await refresh();

    expect(tokens.accessToken).toBe('new-access');
    // TikTok rotates the refresh token on every refresh.
    expect(tokens.refreshToken).toBe('new-refresh');
    expect(tokens.expiresAt).not.toBeNull();

    const [, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(tokenInit.body as string);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh');
    expect(body.get('client_key')).toBe('tt-client-key');
  });

  it('surfaces refresh errors', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: { error: 'invalid_grant', error_description: 'expired' },
    });
    await expect(refresh()).rejects.toThrow(
      /TikTok token request failed \(HTTP 400\).*invalid_grant/,
    );
  });
});
