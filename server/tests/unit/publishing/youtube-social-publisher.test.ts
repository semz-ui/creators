import {
  YouTubeSocialPublisher,
  deriveTitle,
} from '@modules/publishing/infrastructure/youtube-social-publisher';

const publisher = new YouTubeSocialPublisher({ privacyStatus: 'private' });

const VIDEO_BYTES = new Uint8Array([1, 2, 3, 4]).buffer;
const UPLOAD_URL = 'https://upload.youtube.example/session-1';

interface MockResponse {
  ok?: boolean;
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
  arrayBuffer?: ArrayBuffer;
}

/** Build a fetch mock returning the given responses, one per call. */
function mockFetch(...responses: MockResponse[]) {
  const fn = jest.fn();
  for (const res of responses) {
    const headers = res.headers ?? {};
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      statusText: 'OK',
      json: async () => res.json ?? {},
      arrayBuffer: async () => res.arrayBuffer ?? new ArrayBuffer(0),
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

const publish = (caption: string | null = 'My first reel') =>
  publisher.publish({
    platform: 'youtube',
    accessToken: 'tok-1',
    videoUrl: 'https://cdn.example/v.mp4',
    caption,
  });

describe('YouTubeSocialPublisher.publish', () => {
  it('downloads the video, initiates a resumable upload, and PUTs the bytes', async () => {
    const fetchMock = mockFetch(
      { arrayBuffer: VIDEO_BYTES },
      { headers: { location: UPLOAD_URL } },
      { json: { id: 'yt-video-1' } },
    );

    const result = await publish();
    expect(result).toEqual({ externalPostId: 'yt-video-1' });

    const [downloadUrl] = fetchMock.mock.calls[0] as [string];
    expect(downloadUrl).toBe('https://cdn.example/v.mp4');

    const [initUrl, initInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(initUrl).toBe(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    );
    expect(initInit.method).toBe('POST');
    const initHeaders = initInit.headers as Record<string, string>;
    expect(initHeaders.Authorization).toBe('Bearer tok-1');
    expect(initHeaders['Content-Type']).toBe('application/json');
    expect(JSON.parse(initInit.body as string)).toEqual({
      snippet: { title: 'My first reel', description: 'My first reel', categoryId: '22' },
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
    });

    const [putUrl, putInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(putUrl).toBe(UPLOAD_URL);
    expect(putInit.method).toBe('PUT');
    const putHeaders = putInit.headers as Record<string, string>;
    expect(putHeaders.Authorization).toBe('Bearer tok-1');
    expect(putHeaders['Content-Type']).toBe('video/*');
    expect(putInit.body).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('throws when the video download fails', async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(publish()).rejects.toThrow(/Video download failed \(HTTP 404\)/);
  });

  it('surfaces the YouTube error message when initiation fails', async () => {
    mockFetch(
      { arrayBuffer: VIDEO_BYTES },
      { ok: false, status: 401, json: { error: { message: 'Invalid Credentials' } } },
    );
    await expect(publish()).rejects.toThrow(/HTTP 401.*Invalid Credentials/);
  });

  it('throws when no resumable upload URL is returned', async () => {
    mockFetch({ arrayBuffer: VIDEO_BYTES }, { headers: {} });
    await expect(publish()).rejects.toThrow(/no resumable upload URL/);
  });

  it('throws when the byte upload fails or returns no id', async () => {
    mockFetch(
      { arrayBuffer: VIDEO_BYTES },
      { headers: { location: UPLOAD_URL } },
      { ok: false, status: 403, json: { error: { message: 'quotaExceeded' } } },
    );
    await expect(publish()).rejects.toThrow(/HTTP 403.*quotaExceeded/);

    mockFetch({ arrayBuffer: VIDEO_BYTES }, { headers: { location: UPLOAD_URL } }, { json: {} });
    await expect(publish()).rejects.toThrow(/YouTube upload failed/);
  });
});

describe('deriveTitle', () => {
  it('falls back when the caption is null or blank', () => {
    expect(deriveTitle(null)).toBe('Reelo video');
    expect(deriveTitle('   ')).toBe('Reelo video');
  });

  it('flattens whitespace and strips angle brackets', () => {
    expect(deriveTitle('Big\n  launch <day>!')).toBe('Big launch day!');
  });

  it('caps the title at 100 characters', () => {
    expect(deriveTitle('x'.repeat(150))).toHaveLength(100);
  });
});
