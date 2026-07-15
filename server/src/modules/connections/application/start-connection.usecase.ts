import { randomUUID } from 'node:crypto';

import type { IOAuthProviderRegistry } from '../domain/ports/oauth-provider';
import type { IOAuthStateStore } from '../domain/ports/oauth-state-store';
import type { Platform } from '../domain/platform';

export interface StartConnectionConfig {
  publicBaseUrl: string;
  stateTtlSeconds: number;
}

/**
 * Begins linking a platform: mints a one-time `state`, stores it, and returns
 * the provider authorization URL for the client to redirect to.
 */
export class StartConnection {
  constructor(
    private readonly providers: IOAuthProviderRegistry,
    private readonly stateStore: IOAuthStateStore,
    private readonly config: StartConnectionConfig,
  ) {}

  async execute(userId: string, platform: Platform): Promise<{ authorizationUrl: string }> {
    const provider = this.providers.get(platform);
    const state = randomUUID();

    const { url, codeVerifier } = provider.getAuthorizationUrl({
      state,
      redirectUri: callbackUri(this.config.publicBaseUrl),
    });

    await this.stateStore.issue(
      state,
      { userId, platform, ...(codeVerifier ? { codeVerifier } : {}) },
      this.config.stateTtlSeconds,
    );

    return { authorizationUrl: url };
  }
}

export function callbackUri(publicBaseUrl: string): string {
  return `${publicBaseUrl}/api/v1/connections/callback`;
}
