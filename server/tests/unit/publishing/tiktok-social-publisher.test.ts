import {
  TikTokSocialPublisher,
  deriveTitle,
} from '@modules/publishing/infrastructure/tiktok-social-publisher';

const publisher = new TikTokSocialPublisher({
  privacyLevel: 'PUBLIC_TO_EVERYONE',
  pollIntervalMs: 0,
});

const VIDEO_BYTES = new Uint8Array([1, 2, 3, 4]).buffer;
const UPLOAD_URL = 'https://upload.tiktokapis.example/upload-1';

interface MockResponse {
  ok?: boolean;
  status?: number;
  json?: unknown;
  arrayBuffer?: ArrayBuffer;
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
      arrayBuffer: async () => res.arrayBuffer ?? new ArrayBuffer(0),
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

const CREATOR_INFO = {
  json: { data: { privacy_level_options: ['SELF_ONLY', 'PUBLIC_TO_EVERYONE'] } },
};
const INIT_OK = { json: { data: { publish_id: 'pub-1', upload_url: UPLOAD_URL } } };
const STATUS_COMPLETE = {
  json: { data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [7412345] } },
};

const publish = (caption: string | null = 'launch day') =>
  publisher.publish({
    platform: 'tiktok',
    accessToken: 'tok-1',
    videoUrl: 'https://cdn.example/v.mp4',
    caption,
  });

describe('TikTokSocialPublisher.publish', () => {
  it('queries creator info, uploads the file, polls, and returns the publish id', async () => {
    const fetchMock = mockFetch(
      CREATOR_INFO,
      { arrayBuffer: VIDEO_BYTES },
      INIT_OK,
      {}, // PUT
      STATUS_COMPLETE,
    );

    const result = await publish();
    // The published post id, not the publish_id — analytics can only query the former.
    expect(result).toEqual({ externalPostId: '7412345' });

    const [creatorUrl, creatorInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(creatorUrl).toBe('https://open.tiktokapis.com/v2/post/publish/creator_info/query/');
    expect((creatorInit.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');

    const [downloadUrl] = fetchMock.mock.calls[1] as [string];
    expect(downloadUrl).toBe('https://cdn.example/v.mp4');

    const [initUrl, initInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(initUrl).toBe('https://open.tiktokapis.com/v2/post/publish/video/init/');
    const initBody = JSON.parse(initInit.body as string);
    // Configured PUBLIC_TO_EVERYONE is allowed, so it is used.
    expect(initBody.post_info.privacy_level).toBe('PUBLIC_TO_EVERYONE');
    expect(initBody.post_info.title).toBe('launch day');
    expect(initBody.source_info).toEqual({
      source: 'FILE_UPLOAD',
      video_size: 4,
      chunk_size: 4,
      total_chunk_count: 1,
    });

    const [putUrl, putInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(putUrl).toBe(UPLOAD_URL);
    expect(putInit.method).toBe('PUT');
    const putHeaders = putInit.headers as Record<string, string>;
    expect(putHeaders['Content-Range']).toBe('bytes 0-3/4');
    expect(putInit.body).toEqual(new Uint8Array([1, 2, 3, 4]));

    const [statusUrl, statusInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    expect(statusUrl).toBe('https://open.tiktokapis.com/v2/post/publish/status/fetch/');
    expect(JSON.parse(statusInit.body as string)).toEqual({ publish_id: 'pub-1' });
  });

  it('falls back to an allowed privacy level when the configured one is not permitted', async () => {
    const fetchMock = mockFetch(
      { json: { data: { privacy_level_options: ['SELF_ONLY'] } } },
      { arrayBuffer: VIDEO_BYTES },
      INIT_OK,
      {},
      STATUS_COMPLETE,
    );

    await publish();

    const initBody = JSON.parse(
      (fetchMock.mock.calls[2] as [string, RequestInit])[1].body as string,
    );
    // PUBLIC_TO_EVERYONE requires audit approval; pre-audit only SELF_ONLY is allowed.
    expect(initBody.post_info.privacy_level).toBe('SELF_ONLY');
  });

  it('falls back to the publish_id when TikTok withholds the post id', async () => {
    // SELF_ONLY posts are not publicly available, so no post id comes back.
    mockFetch(
      CREATOR_INFO,
      { arrayBuffer: VIDEO_BYTES },
      INIT_OK,
      {},
      {
        json: { data: { status: 'PUBLISH_COMPLETE' } },
      },
    );

    const result = await publish();

    expect(result).toEqual({ externalPostId: 'pub-1' });
  });

  it('throws when creator info returns no privacy options', async () => {
    mockFetch({ json: { data: { privacy_level_options: [] } } });
    await expect(publish()).rejects.toThrow(/no available privacy levels/);
  });

  it('surfaces a creator_info API error (error.code != ok on HTTP 200)', async () => {
    mockFetch({ json: { error: { code: 'access_token_invalid', message: 'Invalid token' } } });
    await expect(publish()).rejects.toThrow(/TikTok creator info failed.*Invalid token/);
  });

  it('throws when the byte upload fails', async () => {
    mockFetch(CREATOR_INFO, { arrayBuffer: VIDEO_BYTES }, INIT_OK, { ok: false, status: 403 });
    await expect(publish()).rejects.toThrow(/TikTok video upload failed \(HTTP 403\)/);
  });

  it('throws when publishing ends in FAILED', async () => {
    mockFetch(
      CREATOR_INFO,
      { arrayBuffer: VIDEO_BYTES },
      INIT_OK,
      {},
      { json: { data: { status: 'FAILED', fail_reason: 'video_format_check_failed' } } },
    );
    await expect(publish()).rejects.toThrow(/TikTok publishing failed: video_format_check_failed/);
  });
});

describe('deriveTitle', () => {
  it('falls back when the caption is null or blank', () => {
    expect(deriveTitle(null)).toBe('Reelo video');
    expect(deriveTitle('   ')).toBe('Reelo video');
  });

  it('flattens whitespace', () => {
    expect(deriveTitle('Big\n  launch  day!')).toBe('Big launch day!');
  });

  it('caps the title at 2200 characters', () => {
    expect(deriveTitle('x'.repeat(3000))).toHaveLength(2200);
  });
});
