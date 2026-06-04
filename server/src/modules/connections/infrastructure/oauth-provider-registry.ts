import { UnsupportedPlatformError } from '../domain/connection.errors';
import type { IOAuthProvider, IOAuthProviderRegistry } from '../domain/ports/oauth-provider';
import { PLATFORMS, type Platform } from '../domain/platform';
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

/** Registry wired with the stub provider for every supported platform. */
export function buildStubProviderRegistry(): StaticOAuthProviderRegistry {
  const providers = new Map<Platform, IOAuthProvider>(
    PLATFORMS.map((platform) => [platform, new StubOAuthProvider(platform)]),
  );
  return new StaticOAuthProviderRegistry(providers);
}
