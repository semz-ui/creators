import { InstagramMetricsProvider } from '@modules/analytics/infrastructure/instagram-metrics.provider';
import { buildMetricsRegistry } from '@modules/analytics/infrastructure/metrics-provider-registry';
import { StubMetricsProvider } from '@modules/analytics/infrastructure/stub-metrics-provider';
import { TikTokMetricsProvider } from '@modules/analytics/infrastructure/tiktok-metrics.provider';
import { YouTubeMetricsProvider } from '@modules/analytics/infrastructure/youtube-metrics.provider';
import { PLATFORMS } from '@modules/connections/domain/platform';

describe('buildMetricsRegistry', () => {
  it('uses the stub for every platform when nothing is configured', () => {
    const registry = buildMetricsRegistry();
    for (const platform of PLATFORMS) {
      expect(registry.get(platform)).toBeInstanceOf(StubMetricsProvider);
    }
  });

  it('wires the real YouTube provider when configured', () => {
    const registry = buildMetricsRegistry({ youtube: true });

    expect(registry.get('youtube')).toBeInstanceOf(YouTubeMetricsProvider);
    expect(registry.get('instagram')).toBeInstanceOf(StubMetricsProvider);
    expect(registry.get('tiktok')).toBeInstanceOf(StubMetricsProvider);
  });

  it('wires all three real providers together', () => {
    const registry = buildMetricsRegistry({ youtube: true, instagram: true, tiktok: true });

    expect(registry.get('youtube')).toBeInstanceOf(YouTubeMetricsProvider);
    expect(registry.get('instagram')).toBeInstanceOf(InstagramMetricsProvider);
    expect(registry.get('tiktok')).toBeInstanceOf(TikTokMetricsProvider);
  });

  it('keeps facebook stubbed even when every platform is configured', () => {
    // Facebook has no publisher, so there are no posts to measure.
    const registry = buildMetricsRegistry({ youtube: true, instagram: true, tiktok: true });

    expect(registry.get('facebook')).toBeInstanceOf(StubMetricsProvider);
  });
});
