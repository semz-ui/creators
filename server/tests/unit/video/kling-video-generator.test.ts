import jwt from 'jsonwebtoken';

import {
  KlingVideoGenerator,
  toKlingDuration,
  type KlingConfig,
} from '@modules/video/infrastructure/kling-video-generator';

const CONFIG: KlingConfig = {
  accessKey: 'ak-test',
  secretKey: 'sk-test-secret',
  baseUrl: 'https://api.example.com',
  modelName: 'kling-v1',
  mode: 'std',
  aspectRatio: '16:9',
};

/** Build a fetch mock returning the given Kling envelope as JSON. */
function mockFetch(envelope: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    json: async () => envelope,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => jest.restoreAllMocks());

describe('toKlingDuration', () => {
  it('maps our duration onto Kling’s 5s/10s options', () => {
    expect(toKlingDuration(5)).toBe('5');
    expect(toKlingDuration(7)).toBe('5');
    expect(toKlingDuration(10)).toBe('10');
    expect(toKlingDuration(60)).toBe('10');
  });
});

describe('KlingVideoGenerator.submit', () => {
  it('posts the prompt and returns the task_id as the jobRef', async () => {
    const fetchMock = mockFetch({ code: 0, data: { task_id: 'task-123' } });

    const handle = await new KlingVideoGenerator(CONFIG).submit({
      videoId: 'v1',
      prompt: 'a neon city',
      durationSeconds: 30,
    });

    expect(handle).toEqual({ jobRef: 'task-123' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/videos/text2video');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      model_name: 'kling-v1',
      prompt: 'a neon city',
      mode: 'std',
      aspect_ratio: '16:9',
      duration: '10',
    });

    // Authorization is a Bearer JWT signed with the secret key (iss = access key).
    const auth = (init.headers as Record<string, string>).Authorization ?? '';
    expect(auth).toMatch(/^Bearer /);
    const decoded = jwt.verify(auth.slice('Bearer '.length), CONFIG.secretKey) as jwt.JwtPayload;
    expect(decoded.iss).toBe('ak-test');
  });

  it('throws when the create response has no task_id', async () => {
    mockFetch({ code: 0, data: {} });
    await expect(
      new KlingVideoGenerator(CONFIG).submit({ videoId: 'v1', prompt: 'x', durationSeconds: 5 }),
    ).rejects.toThrow(/task_id/);
  });

  it('throws on a non-zero envelope code', async () => {
    mockFetch({ code: 1001, message: 'invalid api key' });
    await expect(
      new KlingVideoGenerator(CONFIG).submit({ videoId: 'v1', prompt: 'x', durationSeconds: 5 }),
    ).rejects.toThrow(/invalid api key/);
  });

  it('throws on a non-2xx HTTP status', async () => {
    mockFetch({ message: 'rate limited' }, { ok: false, status: 429 });
    await expect(
      new KlingVideoGenerator(CONFIG).submit({ videoId: 'v1', prompt: 'x', durationSeconds: 5 }),
    ).rejects.toThrow(/HTTP 429/);
  });
});

describe('KlingVideoGenerator.poll', () => {
  const gen = new KlingVideoGenerator(CONFIG);

  it('maps submitted/processing to processing', async () => {
    mockFetch({ code: 0, data: { task_status: 'submitted' } });
    expect(await gen.poll('t1')).toEqual({ state: 'processing' });

    mockFetch({ code: 0, data: { task_status: 'processing' } });
    expect(await gen.poll('t1')).toEqual({ state: 'processing' });
  });

  it('maps succeed to ready with the video url', async () => {
    mockFetch({
      code: 0,
      data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://cdn/out.mp4' }] } },
    });
    expect(await gen.poll('t1')).toEqual({ state: 'ready', resultUrl: 'https://cdn/out.mp4' });
  });

  it('treats succeed-without-url as failed', async () => {
    mockFetch({ code: 0, data: { task_status: 'succeed', task_result: { videos: [] } } });
    expect(await gen.poll('t1')).toEqual({
      state: 'failed',
      error: expect.stringContaining('video url'),
    });
  });

  it('maps failed to failed with the status message', async () => {
    mockFetch({ code: 0, data: { task_status: 'failed', task_status_msg: 'content rejected' } });
    expect(await gen.poll('t1')).toEqual({ state: 'failed', error: 'content rejected' });
  });

  it('treats an unknown status as still processing', async () => {
    mockFetch({ code: 0, data: { task_status: 'queueing' } });
    expect(await gen.poll('t1')).toEqual({ state: 'processing' });
  });

  it('GETs the task by id', async () => {
    const fetchMock = mockFetch({ code: 0, data: { task_status: 'processing' } });
    await gen.poll('task-xyz');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/videos/text2video/task-xyz');
    expect(init.method).toBe('GET');
  });
});
