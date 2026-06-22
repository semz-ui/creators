import {
  SoraVideoGenerator,
  toSoraSeconds,
  type SoraConfig,
} from '@modules/video/infrastructure/sora-video-generator';
import type { IVideoStorage } from '@modules/video/domain/ports/video-storage';

const CONFIG: SoraConfig = {
  apiKey: 'sk-test',
  model: 'sora-2',
  size: '1280x720',
  baseUrl: 'https://api.test/v1',
};

function storageMock(url = 'https://cdn.cloudinary/out.mp4') {
  return {
    upload: jest.fn().mockResolvedValue(url),
    uploadWithMetadata: jest.fn().mockResolvedValue({ url, durationSeconds: 10 }),
  } satisfies Record<keyof IVideoStorage, jest.Mock>;
}

/** Queue a JSON response for the next fetch call. */
function jsonOnce(fn: jest.Mock, body: unknown, ok = true, status = 200) {
  fn.mockResolvedValueOnce({ ok, status, statusText: 'OK', json: async () => body });
}

afterEach(() => jest.restoreAllMocks());

describe('toSoraSeconds', () => {
  it('maps our duration onto Sora’s 8/16/20s options (rounding up)', () => {
    expect(toSoraSeconds(5)).toBe('8');
    expect(toSoraSeconds(8)).toBe('8');
    expect(toSoraSeconds(15)).toBe('16');
    expect(toSoraSeconds(20)).toBe('20');
    expect(toSoraSeconds(60)).toBe('20');
  });
});

describe('SoraVideoGenerator.submit', () => {
  it('creates a video job and returns its id as the jobRef', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { id: 'video_abc', status: 'queued' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const handle = await new SoraVideoGenerator(CONFIG, storageMock()).submit({
      videoId: 'v1',
      prompt: 'a fox in snow',
      durationSeconds: 10,
    });

    expect(handle).toEqual({ jobRef: 'video_abc' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/videos');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'sora-2',
      prompt: 'a fox in snow',
      size: '1280x720',
      seconds: '16', // 10 -> 16
    });
  });

  it('throws when the create response has no id', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { status: 'queued' });
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      new SoraVideoGenerator(CONFIG, storageMock()).submit({
        videoId: 'v1',
        prompt: 'x',
        durationSeconds: 8,
      }),
    ).rejects.toThrow(/id/);
  });
});

describe('SoraVideoGenerator.poll', () => {
  it('maps queued/in_progress to processing', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { id: 't1', status: 'in_progress' });
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await new SoraVideoGenerator(CONFIG, storageMock()).poll('t1')).toEqual({
      state: 'processing',
    });
  });

  it('on completion downloads the MP4, uploads it, and returns the storage url', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { id: 't1', status: 'completed' }); // GET /videos/t1
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }); // GET content
    global.fetch = fetchMock as unknown as typeof fetch;
    const storage = storageMock('https://cdn/final.mp4');

    const result = await new SoraVideoGenerator(CONFIG, storage).poll('t1');

    expect(result).toEqual({ state: 'ready', resultUrl: 'https://cdn/final.mp4', assetId: 't1' });
    const contentUrl = fetchMock.mock.calls[1]![0] as string;
    expect(contentUrl).toBe('https://api.test/v1/videos/t1/content?variant=video');
    const [buf, key, ct] = storage.upload.mock.calls[0]!;
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(key).toBe('t1'); // stable key = jobRef (idempotent)
    expect(ct).toBe('video/mp4');
  });

  it('maps failed to failed with the error message', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { id: 't1', status: 'failed', error: { message: 'moderation_blocked' } });
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await new SoraVideoGenerator(CONFIG, storageMock()).poll('t1')).toEqual({
      state: 'failed',
      error: 'moderation_blocked',
    });
  });

  it('treats an unknown status as still processing', async () => {
    const fetchMock = jest.fn();
    jsonOnce(fetchMock, { id: 't1', status: 'whoknows' });
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await new SoraVideoGenerator(CONFIG, storageMock()).poll('t1')).toEqual({
      state: 'processing',
    });
  });
});
