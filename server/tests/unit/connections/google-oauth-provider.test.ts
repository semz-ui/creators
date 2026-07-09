import {
  GoogleOAuthProvider,
  YOUTUBE_SCOPES,
  type GoogleOAuthConfig,
} from '@modules/connections/infrastructure/google-oauth-provider';

const CONFIG: GoogleOAuthConfig = { clientId: 'client-id', clientSecret: 'client-secret' };
const REDIRECT_URI = 'http://localhost:4000/api/v1/connections/callback';

const TOKEN_RESPONSE = {
  access_token: 'ya29.access',
  refresh_token: '1//refresh',
  expires_in: 3599,
  scope: YOUTUBE_SCOPES.join(' '),
};
const CHANNELS_RESPONSE = {
  items: [{ id: 'UC123', snippet: { title: 'My Channel' } }],
};

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
  new GoogleOAuthProvider(CONFIG).exchangeCode({ code: 'code-1', redirectUri: REDIRECT_URI });

describe('GoogleOAuthProvider.getAuthorizationUrl', () => {
  it('builds the Google consent URL with offline access and the YouTube scopes', () => {
    const url = new URL(
      new GoogleOAuthProvider(CONFIG).getAuthorizationUrl({
        state: 'state-1',
        redirectUri: REDIRECT_URI,
      }),
    );

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('scope')).toBe(YOUTUBE_SCOPES.join(' '));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('include_granted_scopes')).toBe('true');
  });
});

describe('GoogleOAuthProvider.exchangeCode', () => {
  it('exchanges the code and resolves the YouTube channel as the account', async () => {
    const fetchMock = mockFetch({ json: TOKEN_RESPONSE }, { json: CHANNELS_RESPONSE });
    const before = Date.now();

    const account = await exchange();

    expect(account.externalAccountId).toBe('UC123');
    expect(account.displayName).toBe('My Channel');
    expect(account.accessToken).toBe('ya29.access');
    expect(account.refreshToken).toBe('1//refresh');
    expect(account.scopes).toEqual(YOUTUBE_SCOPES);
    expect(account.expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 3599 * 1000);
    expect(account.expiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + 3599 * 1000);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(tokenInit.method).toBe('POST');
    expect((tokenInit.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    const body = new URLSearchParams(tokenInit.body as string);
    expect(body.get('code')).toBe('code-1');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('client_secret')).toBe('client-secret');
    expect(body.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(body.get('grant_type')).toBe('authorization_code');

    const [channelsUrl, channelsInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(channelsUrl).toBe(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    );
    expect((channelsInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer ya29.access',
    );
  });

  it('maps a missing refresh_token and expires_in to nulls', async () => {
    mockFetch({ json: { access_token: 'tok', scope: 'a b' } }, { json: CHANNELS_RESPONSE });

    const account = await exchange();

    expect(account.refreshToken).toBeNull();
    expect(account.expiresAt).toBeNull();
    expect(account.scopes).toEqual(['a', 'b']);
  });

  it('falls back to the requested scopes when Google omits the scope field', async () => {
    mockFetch({ json: { access_token: 'tok' } }, { json: CHANNELS_RESPONSE });
    expect((await exchange()).scopes).toEqual(YOUTUBE_SCOPES);
  });

  it('surfaces Google token errors with their description', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Bad authorization code' },
    });
    await expect(exchange()).rejects.toThrow(/invalid_grant.*Bad authorization code/);
  });

  it('rejects when the Google account has no YouTube channel', async () => {
    mockFetch({ json: TOKEN_RESPONSE }, { json: { items: [] } });
    await expect(exchange()).rejects.toThrow(/no YouTube channel/);
  });

  it('surfaces channel lookup HTTP errors', async () => {
    mockFetch(
      { json: TOKEN_RESPONSE },
      { ok: false, status: 403, json: { error: { message: 'YouTube Data API v3 is disabled' } } },
    );
    await expect(exchange()).rejects.toThrow(/HTTP 403.*YouTube Data API v3 is disabled/);
  });

  it('defaults the display name when the channel has no title', async () => {
    mockFetch({ json: TOKEN_RESPONSE }, { json: { items: [{ id: 'UC9' }] } });
    expect((await exchange()).displayName).toBe('YouTube channel');
  });
});

describe('GoogleOAuthProvider.refreshAccessToken', () => {
  const refresh = () => new GoogleOAuthProvider(CONFIG).refreshAccessToken('1//refresh');

  it('posts the refresh grant and maps the response', async () => {
    const fetchMock = mockFetch({ json: { access_token: 'ya29.new', expires_in: 3599 } });
    const before = Date.now();

    const tokens = await refresh();

    expect(tokens.accessToken).toBe('ya29.new');
    // Google does not rotate refresh tokens on refresh — callers keep theirs.
    expect(tokens.refreshToken).toBeNull();
    expect(tokens.expiresAt?.getTime()).toBeGreaterThanOrEqual(before + 3599 * 1000);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body as string);
    expect(body.get('refresh_token')).toBe('1//refresh');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('client_secret')).toBe('client-secret');
    expect(body.get('grant_type')).toBe('refresh_token');
  });

  it('passes a rotated refresh token through when Google returns one', async () => {
    mockFetch({ json: { access_token: 'tok', refresh_token: '1//rotated' } });
    const tokens = await refresh();
    expect(tokens.refreshToken).toBe('1//rotated');
    expect(tokens.expiresAt).toBeNull();
  });

  it('surfaces refresh errors with their description', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Token has been revoked' },
    });
    await expect(refresh()).rejects.toThrow(
      /Google token refresh failed \(HTTP 400\).*invalid_grant.*Token has been revoked/,
    );
  });
});
