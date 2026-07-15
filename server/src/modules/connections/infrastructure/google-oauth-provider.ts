import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type { IOAuthProvider, OAuthAccount, RefreshedTokens } from '../domain/ports/oauth-provider';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';

/** upload to publish videos; readonly to resolve the channel identity. */
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleChannelsResponse {
  items?: { id?: string; snippet?: { title?: string } }[];
  error?: { message?: string };
}

/**
 * Google OAuth provider for the 'youtube' platform. Exchanges the auth code
 * for tokens, then resolves the user's YouTube channel via the Data API so the
 * connection carries a real account identity (channel id + title).
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  constructor(private readonly config: GoogleOAuthConfig) {}

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES.join(' '),
      state,
      // Google only issues a refresh_token on a consent grant; force it every
      // connect so reconnecting users get refreshable tokens too.
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
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
    const tokens = await this.fetchTokens(code, redirectUri);
    const channel = await this.fetchChannel(tokens.accessToken);
    return {
      externalAccountId: channel.id,
      displayName: channel.title,
      ...tokens,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
    const res = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!res.ok || !json.access_token) {
      const detail = json.error_description ? ` — ${json.error_description}` : '';
      throw new Error(
        `Google token refresh failed (HTTP ${res.status}): ${json.error ?? res.statusText}${detail}`,
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    };
  }

  private async fetchTokens(
    code: string,
    redirectUri: string,
  ): Promise<Pick<OAuthAccount, 'accessToken' | 'refreshToken' | 'scopes' | 'expiresAt'>> {
    const res = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!res.ok || !json.access_token) {
      const detail = json.error_description ? ` — ${json.error_description}` : '';
      throw new Error(
        `Google token exchange failed (HTTP ${res.status}): ${json.error ?? res.statusText}${detail}`,
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      scopes: json.scope ? json.scope.split(' ') : [...YOUTUBE_SCOPES],
      expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    };
  }

  private async fetchChannel(accessToken: string): Promise<{ id: string; title: string }> {
    const res = await fetchWithTimeout(CHANNELS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as GoogleChannelsResponse;
    if (!res.ok) {
      throw new Error(
        `YouTube channel lookup failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    const channel = json.items?.[0];
    if (!channel?.id) {
      throw new Error('Google account has no YouTube channel — create one, then reconnect');
    }
    return { id: channel.id, title: channel.snippet?.title ?? 'YouTube channel' };
  }
}
