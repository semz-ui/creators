import { createHash, randomBytes } from 'node:crypto';

import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type {
  AuthorizationRequest,
  IOAuthProvider,
  OAuthAccount,
  RefreshedTokens,
} from '../domain/ports/oauth-provider';

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name';

/** user.info.basic resolves the account identity; video.publish posts videos. */
export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish'];

export interface TikTokOAuthConfig {
  clientKey: string;
  clientSecret: string;
}

/**
 * TikTok returns two error shapes: the OAuth token endpoint uses top-level
 * ({ error, error_description }) while the open-API endpoints (user info) nest
 * ({ error: { code, message } }). Every response type carries both, defensively.
 */
interface TikTokErrorBody {
  error?: string | { code?: string; message?: string; log_id?: string };
  error_description?: string;
}

interface TokenResponse extends TikTokErrorBody {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_token?: string;
  scope?: string;
}

interface UserInfoResponse extends TikTokErrorBody {
  data?: { user?: { open_id?: string; display_name?: string } };
}

/**
 * TikTok Login Kit OAuth provider. Exchanges the auth code for tokens, then
 * resolves the account's open_id + display name via the user info endpoint.
 *
 * Unlike Google/Instagram, TikTok rotates the refresh token on every refresh,
 * so the new one is returned and must be stored.
 */
export class TikTokOAuthProvider implements IOAuthProvider {
  constructor(private readonly config: TikTokOAuthConfig) {}

  getAuthorizationUrl({
    state,
    redirectUri,
  }: {
    state: string;
    redirectUri: string;
  }): AuthorizationRequest {
    // TikTok's Login Kit requires PKCE. The verifier is stored with the OAuth
    // state and replayed at exchangeCode; only its challenge travels in the URL.
    const { verifier, challenge } = createPkcePair();
    const params = new URLSearchParams({
      client_key: this.config.clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      // TikTok expects comma-separated scopes.
      scope: TIKTOK_SCOPES.join(','),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return { url: `${AUTH_URL}?${params.toString()}`, codeVerifier: verifier };
  }

  async exchangeCode({
    code,
    redirectUri,
    codeVerifier,
  }: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<OAuthAccount> {
    const token = await this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    if (!token.access_token || !token.open_id) {
      throw new Error('TikTok did not return an access token or open_id for the connected account');
    }
    const displayName = await this.fetchDisplayName(token.access_token);

    return {
      externalAccountId: token.open_id,
      displayName,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      scopes: token.scope ? token.scope.split(',') : [...TIKTOK_SCOPES],
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
    const token = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (!token.access_token) {
      throw new Error('TikTok token refresh did not return an access token');
    }
    return {
      accessToken: token.access_token,
      // TikTok rotates the refresh token on every refresh.
      refreshToken: token.refresh_token ?? null,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    };
  }

  private async requestToken(fields: Record<string, string>): Promise<TokenResponse> {
    const res = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.config.clientKey,
        client_secret: this.config.clientSecret,
        ...fields,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as TokenResponse;
    if (!res.ok || !json.access_token) {
      throw new Error(
        `TikTok token request failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return json;
  }

  private async fetchDisplayName(accessToken: string): Promise<string> {
    const res = await fetchWithTimeout(USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as UserInfoResponse;
    if (!res.ok) {
      throw new Error(
        `TikTok user info lookup failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return json.data?.user?.display_name ?? 'TikTok account';
  }
}

/**
 * PKCE pair for TikTok. The verifier is a 43-char base64url string (all
 * unreserved chars, within TikTok's 43–128 range). TikTok's challenge is the
 * **hex** SHA-256 of the verifier — note: not the base64url that RFC 7636 uses.
 */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('hex');
  return { verifier, challenge };
}

function errorDetail(json: TikTokErrorBody, statusText: string): string {
  if (typeof json.error === 'object' && json.error?.message) {
    return json.error.message;
  }
  if (typeof json.error === 'string' && json.error !== '') {
    return [json.error, json.error_description].filter(Boolean).join(' — ');
  }
  return statusText;
}
