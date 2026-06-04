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

    await this.stateStore.issue(state, { userId, platform }, this.config.stateTtlSeconds);

    const authorizationUrl = provider.getAuthorizationUrl({
      state,
      redirectUri: callbackUri(this.config.publicBaseUrl),
    });
    return { authorizationUrl };
  }
}

export function callbackUri(publicBaseUrl: string): string {
  return `${publicBaseUrl}/api/v1/connections/callback`;
}
