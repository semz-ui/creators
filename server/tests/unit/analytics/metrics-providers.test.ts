import { InstagramMetricsProvider } from '@modules/analytics/infrastructure/instagram-metrics.provider';
import { TikTokMetricsProvider } from '@modules/analytics/infrastructure/tiktok-metrics.provider';
import { YouTubeMetricsProvider } from '@modules/analytics/infrastructure/youtube-metrics.provider';

interface MockResponse {
  ok?: boolean;
  status?: number;
  json?: unknown;
}

/** Build a fetch mock returning the given responses, one per call. */
function mockFetch(...responses: MockResponse[]) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      statusText: 'OK',
      json: async () => res.json ?? {},
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

describe('YouTubeMetricsProvider', () => {
  const provider = new YouTubeMetricsProvider();
  const fetchMetrics = () =>
    provider.fetch({ platform: 'youtube', accessToken: 'tok-1', externalPostId: 'yt-1' });

  it('reads statistics for the video and reports shares as 0', async () => {
    const fetchMock = mockFetch({
      json: {
        items: [{ statistics: { viewCount: '1200', likeCount: '34', commentCount: '5' } }],
      },
    });

    const metrics = await fetchMetrics();

    expect(metrics.toValues()).toEqual({ views: 1200, likes: 34, comments: 5, shares: 0 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.googleapis.com/youtube/v3/videos?part=statistics&id=yt-1');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('treats hidden counts as 0 rather than failing', async () => {
    // Uploaders can hide likes and disable comments — the fields are omitted.
    mockFetch({ json: { items: [{ statistics: { viewCount: '10' } }] } });

    const metrics = await fetchMetrics();

    expect(metrics.toValues()).toEqual({ views: 10, likes: 0, comments: 0, shares: 0 });
  });

  it('throws when the video is gone or not visible to this token', async () => {
    mockFetch({ json: { items: [] } });

    await expect(fetchMetrics()).rejects.toThrow('no video for id yt-1');
  });

  it('surfaces the API error message on failure', async () => {
    mockFetch({ ok: false, status: 403, json: { error: { message: 'Insufficient permission' } } });

    await expect(fetchMetrics()).rejects.toThrow(
      'YouTube metrics lookup failed (HTTP 403): Insufficient permission',
    );
  });
});

describe('InstagramMetricsProvider', () => {
  const provider = new InstagramMetricsProvider();
  const fetchMetrics = () =>
    provider.fetch({ platform: 'instagram', accessToken: 'tok-2', externalPostId: 'ig-1' });

  it('reads the insights edge, accepting both value shapes', async () => {
    const fetchMock = mockFetch({
      json: {
        data: [
          { name: 'views', values: [{ value: 900 }] },
          { name: 'likes', total_value: { value: 80 } },
          { name: 'comments', values: [{ value: 7 }] },
          { name: 'shares', values: [{ value: 3 }] },
        ],
      },
    });

    const metrics = await fetchMetrics();

    expect(metrics.toValues()).toEqual({ views: 900, likes: 80, comments: 7, shares: 3 });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      'https://graph.instagram.com/ig-1/insights?metric=views,likes,comments,shares',
    );
  });

  it('defaults metrics the account is not eligible for to 0', async () => {
    mockFetch({ json: { data: [{ name: 'views', values: [{ value: 5 }] }] } });

    const metrics = await fetchMetrics();

    expect(metrics.toValues()).toEqual({ views: 5, likes: 0, comments: 0, shares: 0 });
  });

  it('surfaces a missing-scope error from a connection authorized before insights', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: { error: { message: 'Insufficient permission for metric' } },
    });

    await expect(fetchMetrics()).rejects.toThrow(
      'Instagram metrics lookup failed (HTTP 400): Insufficient permission for metric',
    );
  });
});

describe('TikTokMetricsProvider', () => {
  const provider = new TikTokMetricsProvider();
  const fetchMetrics = () =>
    provider.fetch({ platform: 'tiktok', accessToken: 'tok-3', externalPostId: 'tt-post-1' });

  it('queries by video id and maps the counts', async () => {
    const fetchMock = mockFetch({
      json: {
        data: {
          videos: [{ view_count: 4000, like_count: 210, comment_count: 12, share_count: 9 }],
        },
        error: { code: 'ok' },
      },
    });

    const metrics = await fetchMetrics();

    expect(metrics.toValues()).toEqual({ views: 4000, likes: 210, comments: 12, shares: 9 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ filters: { video_ids: ['tt-post-1'] } });
  });

  it('throws for an id TikTok does not recognize, such as a legacy publish_id', async () => {
    mockFetch({ json: { data: { videos: [] }, error: { code: 'ok' } } });

    await expect(fetchMetrics()).rejects.toThrow('no video for id tt-post-1');
  });

  it('treats an error code in a 200 envelope as a failure', async () => {
    mockFetch({
      json: { error: { code: 'scope_not_authorized', message: 'video.list required' } },
    });

    await expect(fetchMetrics()).rejects.toThrow(
      'TikTok metrics lookup failed (HTTP 200): video.list required',
    );
  });
});
