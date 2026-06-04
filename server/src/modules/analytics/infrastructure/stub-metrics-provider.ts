import { UnsupportedPlatformError } from '@modules/connections/domain/connection.errors';
import { PLATFORMS, type Platform } from '@modules/connections/domain/platform';

import { Metrics } from '../domain/metrics';
import type { IMetricsProvider, IMetricsProviderRegistry } from '../domain/ports/metrics-provider';

/** Deterministic hash so the same post always yields the same numbers in tests. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Placeholder metrics provider: derives stable pseudo-metrics from the post id.
 * Real per-platform integrations drop in behind {@link IMetricsProvider}.
 */
export class StubMetricsProvider implements IMetricsProvider {
  async fetch(params: { externalPostId: string }): Promise<Metrics> {
    const seed = hash(params.externalPostId);
    return Metrics.of({
      views: seed % 10000,
      likes: seed % 1000,
      comments: seed % 200,
      shares: seed % 100,
    });
  }
}

/** Resolves the metrics provider for a platform from a fixed map. */
export class StaticMetricsProviderRegistry implements IMetricsProviderRegistry {
  constructor(private readonly providers: Map<Platform, IMetricsProvider>) {}

  get(platform: Platform): IMetricsProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new UnsupportedPlatformError(platform);
    }
    return provider;
  }
}

/** Registry wired with the stub provider for every supported platform. */
export function buildStubMetricsRegistry(): StaticMetricsProviderRegistry {
  const shared = new StubMetricsProvider();
  return new StaticMetricsProviderRegistry(
    new Map<Platform, IMetricsProvider>(PLATFORMS.map((platform) => [platform, shared])),
  );
}
