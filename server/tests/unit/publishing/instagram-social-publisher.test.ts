import { InstagramSocialPublisher } from '@modules/publishing/infrastructure/instagram-social-publisher';

const ME = { json: { user_id: 17841401 } };
const CONTAINER = { json: { id: 'container-1' } };
const IN_PROGRESS = { json: { status_code: 'IN_PROGRESS' } };
const FINISHED = { json: { status_code: 'FINISHED' } };
const PUBLISHED_MEDIA = { json: { id: 'ig-media-1' } };

/** Build a fetch mock returning the given JSON bodies, one per call. */
function mockFetch(...responses: { ok?: boolean; status?: number; json: unknown }[]) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      statusText: 'OK',
      json: async () => res.json,
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

const publish = (
  publisher = new InstagramSocialPublisher({ pollIntervalMs: 1 }),
  caption: string | null = 'My first reel',
) =>
  publisher.publish({
    platform: 'instagram',
    accessToken: 'tok-1',
    videoUrl: 'https://cdn.example/v.mp4',
    caption,
  });

describe('InstagramSocialPublisher.publish', () => {
  it('creates a container, waits for processing, and publishes it', async () => {
    const fetchMock = mockFetch(ME, CONTAINER, IN_PROGRESS, FINISHED, PUBLISHED_MEDIA);

    const result = await publish();
    expect(result).toEqual({ externalPostId: 'ig-media-1' });

    const [meUrl, meInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(meUrl).toBe('https://graph.instagram.com/me?fields=user_id');
    expect((meInit.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');

    const [containerUrl, containerInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(containerUrl).toBe('https://graph.instagram.com/17841401/media');
    expect(containerInit.method).toBe('POST');
    expect((containerInit.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(containerInit.body as string)).toEqual({
      media_type: 'REELS',
      video_url: 'https://cdn.example/v.mp4',
      caption: 'My first reel',
    });

    const [statusUrl] = fetchMock.mock.calls[2] as [string];
    expect(statusUrl).toBe('https://graph.instagram.com/container-1?fields=status_code');
    expect(fetchMock.mock.calls[3]?.[0]).toBe(statusUrl);

    const [publishUrl, publishInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    expect(publishUrl).toBe('https://graph.instagram.com/17841401/media_publish');
    expect(publishInit.method).toBe('POST');
    expect(JSON.parse(publishInit.body as string)).toEqual({ creation_id: 'container-1' });
  });

  it('omits the caption field when the caption is null', async () => {
    const fetchMock = mockFetch(ME, CONTAINER, FINISHED, PUBLISHED_MEDIA);

    await publish(undefined, null);

    const [, containerInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(containerInit.body as string)).toEqual({
      media_type: 'REELS',
      video_url: 'https://cdn.example/v.mp4',
    });
  });

  it('fails when the user lookup fails', async () => {
    mockFetch({
      ok: false,
      status: 401,
      json: { error: { message: 'Invalid OAuth access token' } },
    });
    await expect(publish()).rejects.toThrow(
      /Instagram user lookup failed \(HTTP 401\).*Invalid OAuth access token/,
    );
  });

  it('fails when container creation is rejected', async () => {
    mockFetch(ME, {
      ok: false,
      status: 400,
      json: { error: { message: 'The video format is not supported' } },
    });
    await expect(publish()).rejects.toThrow(
      /Instagram media container creation failed \(HTTP 400\).*video format is not supported/,
    );
  });

  it('fails when the container ends in ERROR', async () => {
    mockFetch(ME, CONTAINER, { json: { status_code: 'ERROR' } });
    await expect(publish()).rejects.toThrow(/container failed with status ERROR/);
  });

  it('times out when the container never finishes', async () => {
    mockFetch(ME, CONTAINER, IN_PROGRESS);
    const publisher = new InstagramSocialPublisher({ pollIntervalMs: 1, maxPollAttempts: 1 });
    await expect(publish(publisher)).rejects.toThrow(/not ready after 1 status checks/);
  });

  it('treats an already-PUBLISHED container as ready', async () => {
    mockFetch(ME, CONTAINER, { json: { status_code: 'PUBLISHED' } }, PUBLISHED_MEDIA);
    expect(await publish()).toEqual({ externalPostId: 'ig-media-1' });
  });

  it('fails when media_publish is rejected', async () => {
    mockFetch(ME, CONTAINER, FINISHED, {
      ok: false,
      status: 400,
      json: { error: { message: 'Media ID is not available' } },
    });
    await expect(publish()).rejects.toThrow(
      /Instagram publish failed \(HTTP 400\).*Media ID is not available/,
    );
  });
});
