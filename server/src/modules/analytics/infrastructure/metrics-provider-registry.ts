import { PLATFORMS, type Platform } from '@modules/connections/domain/platform';

import type { IMetricsProvider } from '../domain/ports/metrics-provider';
import { InstagramMetricsProvider } from './instagram-metrics.provider';
import { StaticMetricsProviderRegistry, StubMetricsProvider } from './stub-metrics-provider';
import { TikTokMetricsProvider } from './tiktok-metrics.provider';
import { YouTubeMetricsProvider } from './youtube-metrics.provider';

export interface MetricsRegistryConfig {
  /** When set, the real YouTube provider handles 'youtube'. */
  youtube?: boolean;
  /** When set, the real Instagram provider handles 'instagram'. */
  instagram?: boolean;
  /** When set, the real TikTok provider handles 'tiktok'. */
  tiktok?: boolean;
}

/**
 * Registry with real providers where the platform's OAuth credentials are
 * configured and the stub everywhere else, so the app always boots for local
 * dev, demos, and tests.
 *
 * Gating on OAuth credentials (rather than metrics-specific ones) is deliberate:
 * these providers authenticate with the connection's access token and need no
 * credentials of their own, and without real OAuth the stored tokens are stub
 * tokens that no live API would accept.
 *
 * Facebook has no real provider — the platform has no publisher either, so
 * there are no posts to measure.
 */
export function buildMetricsRegistry(
  config: MetricsRegistryConfig = {},
): StaticMetricsProviderRegistry {
  const stub = new StubMetricsProvider();
  const providers = new Map<Platform, IMetricsProvider>(
    PLATFORMS.map((platform) => [platform, stub]),
  );
  if (config.youtube) {
    providers.set('youtube', new YouTubeMetricsProvider());
  }
  if (config.instagram) {
    providers.set('instagram', new InstagramMetricsProvider());
  }
  if (config.tiktok) {
    providers.set('tiktok', new TikTokMetricsProvider());
  }
  return new StaticMetricsProviderRegistry(providers);
}
