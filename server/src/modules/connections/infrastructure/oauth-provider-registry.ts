import { UnsupportedPlatformError } from '../domain/connection.errors';
import type { IOAuthProvider, IOAuthProviderRegistry } from '../domain/ports/oauth-provider';
import { PLATFORMS, type Platform } from '../domain/platform';
import { GoogleOAuthProvider, type GoogleOAuthConfig } from './google-oauth-provider';
import { StubOAuthProvider } from './stub-oauth-provider';

/** Looks up the OAuth provider for a platform from a fixed map. */
export class StaticOAuthProviderRegistry implements IOAuthProviderRegistry {
  constructor(private readonly providers: Map<Platform, IOAuthProvider>) {}

  get(platform: Platform): IOAuthProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new UnsupportedPlatformError(platform);
    }
    return provider;
  }
}

export interface ProviderRegistryConfig {
  /** When set, the real Google provider handles 'youtube'. */
  google?: GoogleOAuthConfig;
}

/**
 * Registry with real providers where credentials are configured and the stub
 * everywhere else, so the app always boots for local dev, demos, and tests.
 */
export function buildProviderRegistry(
  config: ProviderRegistryConfig = {},
): StaticOAuthProviderRegistry {
  const providers = new Map<Platform, IOAuthProvider>(
    PLATFORMS.map((platform) => [platform, new StubOAuthProvider(platform)]),
  );
  if (config.google) {
    providers.set('youtube', new GoogleOAuthProvider(config.google));
  }
  return new StaticOAuthProviderRegistry(providers);
}
