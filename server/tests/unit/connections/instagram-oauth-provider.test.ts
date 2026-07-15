import {
  InstagramOAuthProvider,
  INSTAGRAM_SCOPES,
  type InstagramOAuthConfig,
} from '@modules/connections/infrastructure/instagram-oauth-provider';

const CONFIG: InstagramOAuthConfig = { appId: 'ig-app-id', appSecret: 'ig-app-secret' };
const REDIRECT_URI = 'http://localhost:4000/api/v1/connections/callback';

const SHORT_RESPONSE = {
  access_token: 'short-tok',
  user_id: 17841400000000000,
  permissions: INSTAGRAM_SCOPES,
};
const LONG_RESPONSE = { access_token: 'long-tok', token_type: 'bearer', expires_in: 5183944 };
const ME_RESPONSE = { user_id: '17841400000000000', username: 'reelo.creator' };

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
  new InstagramOAuthProvider(CONFIG).exchangeCode({ code: 'code-1', redirectUri: REDIRECT_URI });

describe('InstagramOAuthProvider.getAuthorizationUrl', () => {
  it('builds the Instagram consent URL with comma-separated scopes', () => {
    const url = new URL(
      new InstagramOAuthProvider(CONFIG).getAuthorizationUrl({
        state: 'state-1',
        redirectUri: REDIRECT_URI,
      }).url,
    );

    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('ig-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('scope')).toBe(
      'instagram_business_basic,instagram_business_content_publish',
    );
  });
});

describe('InstagramOAuthProvider.exchangeCode', () => {
  it('exchanges the code, upgrades to a long-lived token, and resolves the profile', async () => {
    const fetchMock = mockFetch(
      { json: SHORT_RESPONSE },
      { json: LONG_RESPONSE },
      { json: ME_RESPONSE },
    );
    const before = Date.now();

    const account = await exchange();

    expect(account.externalAccountId).toBe('17841400000000000');
    expect(account.displayName).toBe('reelo.creator');
    expect(account.accessToken).toBe('long-tok');
    // No separate refresh token on Instagram — the long-lived token is both.
    expect(account.refreshToken).toBe('long-tok');
    expect(account.scopes).toEqual(INSTAGRAM_SCOPES);
    expect(account.expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 5183944 * 1000);
    expect(account.expiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + 5183944 * 1000);

    const [shortUrl, shortInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(shortUrl).toBe('https://api.instagram.com/oauth/access_token');
    expect(shortInit.method).toBe('POST');
    const body = new URLSearchParams(shortInit.body as string);
    expect(body.get('client_id')).toBe('ig-app-id');
    expect(body.get('client_secret')).toBe('ig-app-secret');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(body.get('code')).toBe('code-1');

    const [longUrl] = fetchMock.mock.calls[1] as [string];
    const longParams = new URL(longUrl);
    expect(longParams.origin + longParams.pathname).toBe(
      'https://graph.instagram.com/access_token',
    );
    expect(longParams.searchParams.get('grant_type')).toBe('ig_exchange_token');
    expect(longParams.searchParams.get('client_secret')).toBe('ig-app-secret');
    expect(longParams.searchParams.get('access_token')).toBe('short-tok');

    const [meUrl, meInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(meUrl).toBe('https://graph.instagram.com/me?fields=user_id,username');
    expect((meInit.headers as Record<string, string>).Authorization).toBe('Bearer long-tok');
  });

  it('surfaces the flat api.instagram.com error shape', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: {
        error_type: 'OAuthException',
        code: 400,
        error_message: 'Invalid authorization code',
      },
    });
    await expect(exchange()).rejects.toThrow(
      /Instagram token exchange failed \(HTTP 400\).*OAuthException — Invalid authorization code/,
    );
  });

  it('surfaces the nested graph.instagram.com error shape on the long-lived exchange', async () => {
    mockFetch(
      { json: SHORT_RESPONSE },
      { ok: false, status: 400, json: { error: { message: 'Invalid grant type' } } },
    );
    await expect(exchange()).rejects.toThrow(
      /Instagram long-lived token exchange failed \(HTTP 400\).*Invalid grant type/,
    );
  });

  it('surfaces profile lookup failures', async () => {
    mockFetch(
      { json: SHORT_RESPONSE },
      { json: LONG_RESPONSE },
      { ok: false, status: 401, json: { error: { message: 'Invalid OAuth access token' } } },
    );
    await expect(exchange()).rejects.toThrow(/Instagram profile lookup failed \(HTTP 401\)/);
  });

  it('defaults the display name and falls back to scopes when fields are missing', async () => {
    mockFetch(
      { json: { access_token: 'short-tok', user_id: 123 } },
      { json: LONG_RESPONSE },
      { json: {} },
    );

    const account = await exchange();
    expect(account.displayName).toBe('Instagram account');
    expect(account.scopes).toEqual(INSTAGRAM_SCOPES);
    expect(account.externalAccountId).toBe('123');
  });
});

describe('InstagramOAuthProvider.refreshAccessToken', () => {
  const refresh = () => new InstagramOAuthProvider(CONFIG).refreshAccessToken('old-long-tok');

  it('refreshes via ig_refresh_token and rotates the stored token', async () => {
    const fetchMock = mockFetch({ json: { access_token: 'new-long-tok', expires_in: 5184000 } });
    const before = Date.now();

    const tokens = await refresh();

    expect(tokens.accessToken).toBe('new-long-tok');
    expect(tokens.refreshToken).toBe('new-long-tok');
    expect(tokens.expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 5184000 * 1000);

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://graph.instagram.com/refresh_access_token',
    );
    expect(parsed.searchParams.get('grant_type')).toBe('ig_refresh_token');
    expect(parsed.searchParams.get('access_token')).toBe('old-long-tok');
  });

  it('surfaces refresh errors', async () => {
    mockFetch({ ok: false, status: 400, json: { error: { message: 'Session has expired' } } });
    await expect(refresh()).rejects.toThrow(
      /Instagram token refresh failed \(HTTP 400\).*Session has expired/,
    );
  });
});
