import {
  PikaVideoGenerator,
  toPikaDuration,
  toQueueBase,
  type PikaConfig,
} from '@modules/video/infrastructure/pika-video-generator';

const CONFIG: PikaConfig = {
  apiKey: 'fal-key-test',
  model: 'fal-ai/pika/v2.2/text-to-video',
  aspectRatio: '16:9',
  resolution: '720p',
};

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

const generator = new PikaVideoGenerator(CONFIG);

describe('toQueueBase', () => {
  it('drops the model sub-path, which fal omits from status and result URLs', () => {
    expect(toQueueBase('fal-ai/pika/v2.2/text-to-video')).toBe('fal-ai/pika');
    expect(toQueueBase('fal-ai/pika/v2.1/text-to-video')).toBe('fal-ai/pika');
  });

  it('leaves a bare namespace/app id alone', () => {
    expect(toQueueBase('fal-ai/fast-sdxl')).toBe('fal-ai/fast-sdxl');
  });

  it('rejects a model id without a namespace', () => {
    expect(() => toQueueBase('pika')).toThrow(/namespace/);
  });
});

describe('toPikaDuration', () => {
  it('clamps our 5–60s range onto Pika’s 5–10s window', () => {
    expect(toPikaDuration(5)).toBe(5);
    expect(toPikaDuration(8)).toBe(8);
    expect(toPikaDuration(10)).toBe(10);
    expect(toPikaDuration(60)).toBe(10);
  });
});

describe('PikaVideoGenerator.submit', () => {
  it('posts to the full model path and returns request_id as the jobRef', async () => {
    const fetchMock = mockFetch({ json: { request_id: 'req-123' } });

    const handle = await generator.submit({
      videoId: 'vid-1',
      prompt: 'a neon skyline',
      durationSeconds: 15,
    });

    expect(handle).toEqual({ jobRef: 'req-123' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // Submitting keeps the sub-path.
    expect(url).toBe('https://queue.fal.run/fal-ai/pika/v2.2/text-to-video');
    expect((init.headers as Record<string, string>).Authorization).toBe('Key fal-key-test');
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'a neon skyline',
      duration: 10,
      aspect_ratio: '16:9',
      resolution: '720p',
    });
  });

  it('throws when the submit response has no request_id', async () => {
    mockFetch({ json: {} });

    await expect(
      generator.submit({ videoId: 'vid-1', prompt: 'x', durationSeconds: 5 }),
    ).rejects.toThrow('missing request_id');
  });

  it('surfaces a fal validation error', async () => {
    mockFetch({
      ok: false,
      status: 422,
      json: { detail: [{ msg: 'duration must be <= 10' }] },
    });

    await expect(
      generator.submit({ videoId: 'vid-1', prompt: 'x', durationSeconds: 5 }),
    ).rejects.toThrow('Pika API error (HTTP 422): duration must be <= 10');
  });
});

describe('PikaVideoGenerator.poll', () => {
  it('maps queued and running states to processing', async () => {
    mockFetch({ json: { status: 'IN_QUEUE' } });
    expect(await generator.poll('req-123')).toEqual({ state: 'processing' });

    mockFetch({ json: { status: 'IN_PROGRESS' } });
    expect(await generator.poll('req-123')).toEqual({ state: 'processing' });
  });

  it('fetches the result on COMPLETED and returns the hosted url', async () => {
    const fetchMock = mockFetch(
      { json: { status: 'COMPLETED' } },
      { json: { video: { url: 'https://v3.fal.media/files/out.mp4' } } },
    );

    const result = await generator.poll('req-123');

    // No assetId: the file stays on fal's CDN, so audio can't be composited.
    expect(result).toEqual({ state: 'ready', resultUrl: 'https://v3.fal.media/files/out.mp4' });

    const [statusUrl] = fetchMock.mock.calls[0] as [string];
    const [resultUrl] = fetchMock.mock.calls[1] as [string];
    // Status and result drop the sub-path.
    expect(statusUrl).toBe('https://queue.fal.run/fal-ai/pika/requests/req-123/status');
    expect(resultUrl).toBe('https://queue.fal.run/fal-ai/pika/requests/req-123');
  });

  it('fails when a completed request carries no video url', async () => {
    mockFetch({ json: { status: 'COMPLETED' } }, { json: {} });

    expect(await generator.poll('req-123')).toEqual({
      state: 'failed',
      error: 'Pika: completed request returned no video url',
    });
  });

  it('treats an unknown status as still running so the next read retries', async () => {
    mockFetch({ json: { status: 'SOMETHING_NEW' } });

    expect(await generator.poll('req-123')).toEqual({ state: 'processing' });
  });
});
