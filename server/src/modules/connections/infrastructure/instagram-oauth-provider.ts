import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type { IOAuthProvider, OAuthAccount, RefreshedTokens } from '../domain/ports/oauth-provider';

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const SHORT_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';

/** basic to resolve the account identity; content_publish to post Reels. */
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

export interface InstagramOAuthConfig {
  appId: string;
  appSecret: string;
}

/**
 * Meta returns two error shapes: api.instagram.com is flat
 * ({ error_type, error_message }) while graph.instagram.com nests
 * ({ error: { message } }). Every response type carries both, defensively.
 */
interface MetaErrorBody {
  error?: { message?: string; type?: string; code?: number };
  error_type?: string;
  error_message?: string;
}

interface ShortLivedTokenResponse extends MetaErrorBody {
  access_token?: string;
  user_id?: number | string;
  permissions?: string[] | string;
}

interface LongLivedTokenResponse extends MetaErrorBody {
  access_token?: string;
  expires_in?: number;
}

interface MeResponse extends MetaErrorBody {
  user_id?: number | string;
  username?: string;
}

/**
 * Instagram OAuth provider ("Instagram API with Instagram Login" / Business
 * Login — no Facebook Page involved; requires a Professional account).
 * Exchanges the auth code for a short-lived token, upgrades it to a 60-day
 * long-lived token, and resolves the account's username.
 *
 * Instagram has no separate refresh token: the long-lived token refreshes
 * itself, so it is stored as both accessToken and refreshToken.
 */
export class InstagramOAuthProvider implements IOAuthProvider {
  constructor(private readonly config: InstagramOAuthConfig) {}

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // Instagram expects comma-separated scopes.
      scope: INSTAGRAM_SCOPES.join(','),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri: string;
  }): Promise<OAuthAccount> {
    const short = await this.exchangeShortLived(code, redirectUri);
    const long = await this.exchangeLongLived(short.accessToken);
    const profile = await this.fetchProfile(long.accessToken);

    const externalAccountId = short.userId ?? profile.userId;
    if (!externalAccountId) {
      throw new Error('Instagram did not return a user id for the connected account');
    }

    return {
      externalAccountId,
      displayName: profile.username,
      accessToken: long.accessToken,
      refreshToken: long.accessToken,
      scopes: short.permissions ?? [...INSTAGRAM_SCOPES],
      expiresAt: long.expiresAt,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
    // Meta requires the token to be at least 24h old and unexpired; with
    // 60-day tokens and the access service's short refresh buffer this never
    // bites in practice.
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: refreshToken,
    });
    const res = await fetchWithTimeout(`${GRAPH_BASE}/refresh_access_token?${params.toString()}`);
    const json = (await res.json().catch(() => ({}))) as LongLivedTokenResponse;
    if (!res.ok || !json.access_token) {
      throw new Error(
        `Instagram token refresh failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return {
      accessToken: json.access_token,
      // The new long-lived token is also the next refresh token.
      refreshToken: json.access_token,
      expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    };
  }

  private async exchangeShortLived(
    code: string,
    redirectUri: string,
  ): Promise<{ accessToken: string; userId: string | null; permissions: string[] | null }> {
    const res = await fetchWithTimeout(SHORT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as ShortLivedTokenResponse;
    if (!res.ok || !json.access_token) {
      throw new Error(
        `Instagram token exchange failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return {
      accessToken: json.access_token,
      userId: json.user_id != null ? String(json.user_id) : null,
      permissions: normalizePermissions(json.permissions),
    };
  }

  private async exchangeLongLived(
    shortLivedToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null }> {
    // Query-param auth is Meta's documented contract for this endpoint; the
    // URL must never appear in logs or error messages.
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.config.appSecret,
      access_token: shortLivedToken,
    });
    const res = await fetchWithTimeout(`${GRAPH_BASE}/access_token?${params.toString()}`);
    const json = (await res.json().catch(() => ({}))) as LongLivedTokenResponse;
    if (!res.ok || !json.access_token) {
      throw new Error(
        `Instagram long-lived token exchange failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return {
      accessToken: json.access_token,
      expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    };
  }

  private async fetchProfile(
    accessToken: string,
  ): Promise<{ userId: string | null; username: string }> {
    const res = await fetchWithTimeout(`${GRAPH_BASE}/me?fields=user_id,username`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as MeResponse;
    if (!res.ok) {
      throw new Error(
        `Instagram profile lookup failed (HTTP ${res.status}): ${errorDetail(json, res.statusText)}`,
      );
    }
    return {
      userId: json.user_id != null ? String(json.user_id) : null,
      username: json.username ?? 'Instagram account',
    };
  }
}

function errorDetail(json: MetaErrorBody, statusText: string): string {
  if (json.error?.message) {
    return json.error.message;
  }
  if (json.error_type || json.error_message) {
    return [json.error_type, json.error_message].filter(Boolean).join(' — ');
  }
  return statusText;
}

function normalizePermissions(permissions: string[] | string | undefined): string[] | null {
  if (Array.isArray(permissions)) {
    return permissions;
  }
  if (typeof permissions === 'string' && permissions !== '') {
    return permissions.split(',');
  }
  return null;
}
