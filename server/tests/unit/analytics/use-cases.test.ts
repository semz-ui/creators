import { GetOverview } from '@modules/analytics/application/get-overview.usecase';
import { GetVideoAnalytics } from '@modules/analytics/application/get-video-analytics.usecase';
import { SyncUserMetrics } from '@modules/analytics/application/sync-user-metrics.usecase';
import { Metrics } from '@modules/analytics/domain/metrics';
import type { IConnectionTokenProvider } from '@modules/analytics/domain/ports/connection-token-provider';
import type { IMetricsProviderRegistry } from '@modules/analytics/domain/ports/metrics-provider';
import type { IPublishedPostsProvider } from '@modules/analytics/domain/ports/published-posts-provider';
import type { IVideoMetricRepository } from '@modules/analytics/domain/ports/video-metric-repository';
import { VideoMetric } from '@modules/analytics/domain/video-metric.entity';

function metricRepoMock() {
  return {
    upsert: jest.fn().mockResolvedValue(undefined),
    listByUser: jest.fn(),
    listByUserAndVideo: jest.fn(),
  } satisfies Record<keyof IVideoMetricRepository, jest.Mock>;
}

function metric(videoId: string, platform: 'facebook' | 'youtube', values: number) {
  return VideoMetric.create({
    userId: 'u1',
    videoId,
    platform,
    externalPostId: `${platform}-post`,
    metrics: Metrics.of({ views: values, likes: values, comments: values, shares: values }),
  });
}

describe('SyncUserMetrics', () => {
  it('fetches and upserts metrics for each post with a connection', async () => {
    const publishedPosts: IPublishedPostsProvider = {
      getPublishedPosts: jest.fn().mockResolvedValue([
        { videoId: 'v1', platform: 'facebook', externalPostId: 'fb-1' },
        { videoId: 'v1', platform: 'youtube', externalPostId: 'yt-1' },
      ]),
    };
    const connections: IConnectionTokenProvider = {
      // youtube has no active connection → skipped.
      getActiveConnection: jest
        .fn()
        .mockImplementation((_u: string, p: string) =>
          Promise.resolve(p === 'facebook' ? { accessToken: 'tok' } : null),
        ),
    };
    const providers: IMetricsProviderRegistry = {
      get: jest.fn().mockReturnValue({
        fetch: jest
          .fn()
          .mockResolvedValue(Metrics.of({ views: 1, likes: 1, comments: 1, shares: 1 })),
      }),
    };
    const repo = metricRepoMock();

    const result = await new SyncUserMetrics(publishedPosts, connections, providers, repo).execute(
      'u1',
    );

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(repo.upsert).toHaveBeenCalledTimes(1);
  });

  it('isolates a failing post so the rest of the sweep still syncs', async () => {
    const publishedPosts: IPublishedPostsProvider = {
      getPublishedPosts: jest.fn().mockResolvedValue([
        { videoId: 'v1', platform: 'facebook', externalPostId: 'fb-1' },
        { videoId: 'v2', platform: 'facebook', externalPostId: 'fb-2' },
        { videoId: 'v3', platform: 'facebook', externalPostId: 'fb-3' },
      ]),
    };
    const connections: IConnectionTokenProvider = {
      getActiveConnection: jest.fn().mockResolvedValue({ accessToken: 'tok' }),
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(Metrics.of({ views: 1, likes: 1, comments: 1, shares: 1 }))
      // A revoked token, a deleted post, or a platform 429 lands here.
      .mockRejectedValueOnce(new Error('HTTP 401: token revoked'))
      .mockResolvedValueOnce(Metrics.of({ views: 2, likes: 2, comments: 2, shares: 2 }));
    const providers: IMetricsProviderRegistry = {
      get: jest.fn().mockReturnValue({ fetch: fetchMock }),
    };
    const repo = metricRepoMock();

    const result = await new SyncUserMetrics(publishedPosts, connections, providers, repo).execute(
      'u1',
    );

    expect(result).toEqual({ synced: 2, failed: 1 });
    // The post after the failure was still fetched and stored.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(repo.upsert).toHaveBeenCalledTimes(2);
  });
});

describe('GetOverview', () => {
  it('aggregates totals, per-platform, and distinct video count', async () => {
    const repo = metricRepoMock();
    repo.listByUser.mockResolvedValue([
      metric('v1', 'facebook', 10),
      metric('v1', 'youtube', 20),
      metric('v2', 'facebook', 5),
    ]);

    const result = await new GetOverview(repo).execute('u1');

    expect(result.totals).toEqual({ views: 35, likes: 35, comments: 35, shares: 35 });
    expect(result.videoCount).toBe(2);
    const fb = result.byPlatform.find((p) => p.platform === 'facebook');
    expect(fb?.metrics.views).toBe(15);
  });

  it('returns zeros for a user with no metrics', async () => {
    const repo = metricRepoMock();
    repo.listByUser.mockResolvedValue([]);

    const result = await new GetOverview(repo).execute('u1');
    expect(result.totals).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 });
    expect(result.byPlatform).toEqual([]);
    expect(result.videoCount).toBe(0);
  });
});

describe('GetVideoAnalytics', () => {
  it('returns per-platform metrics and totals for a video', async () => {
    const repo = metricRepoMock();
    repo.listByUserAndVideo.mockResolvedValue([
      metric('v1', 'facebook', 10),
      metric('v1', 'youtube', 20),
    ]);

    const result = await new GetVideoAnalytics(repo).execute('u1', 'v1');

    expect(result.videoId).toBe('v1');
    expect(result.byPlatform).toHaveLength(2);
    expect(result.totals.views).toBe(30);
  });

  it('is empty (not an error) when there are no metrics', async () => {
    const repo = metricRepoMock();
    repo.listByUserAndVideo.mockResolvedValue([]);

    const result = await new GetVideoAnalytics(repo).execute('u1', 'missing');
    expect(result.byPlatform).toEqual([]);
    expect(result.totals).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 });
  });
});
