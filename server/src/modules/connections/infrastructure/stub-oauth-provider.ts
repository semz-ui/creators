import { randomUUID } from 'node:crypto';

import type {
  AuthorizationRequest,
  IOAuthProvider,
  OAuthAccount,
  RefreshedTokens,
} from '../domain/ports/oauth-provider';
import type { Platform } from '../domain/platform';

const SCOPES: Record<Platform, string[]> = {
  facebook: ['pages_manage_posts', 'pages_read_engagement'],
  instagram: ['instagram_business_basic', 'instagram_business_content_publish'],
  youtube: ['https://www.googleapis.com/auth/youtube.upload'],
  tiktok: ['video.publish'],
};

/**
 * Placeholder OAuth provider used until real per-platform integrations exist.
 * Produces a deterministic authorization URL and fake account/tokens on
 * exchange. Swap a real {@link IOAuthProvider} into the registry per platform.
 */
export class StubOAuthProvider implements IOAuthProvider {
  constructor(private readonly platform: Platform) {}

  getAuthorizationUrl({
    state,
    redirectUri,
  }: {
    state: string;
    redirectUri: string;
  }): AuthorizationRequest {
    const params = new URLSearchParams({ state, redirect_uri: redirectUri, response_type: 'code' });
    return { url: `https://oauth.stub.local/${this.platform}/authorize?${params.toString()}` };
  }

  async exchangeCode(_params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<OAuthAccount> {
    return {
      externalAccountId: `${this.platform}_${randomUUID().slice(0, 8)}`,
      displayName: `Stub ${this.platform} account`,
      accessToken: `stub-access-${randomUUID()}`,
      refreshToken: `stub-refresh-${randomUUID()}`,
      scopes: SCOPES[this.platform],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<RefreshedTokens> {
    return {
      accessToken: `stub-access-${randomUUID()}`,
      refreshToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
