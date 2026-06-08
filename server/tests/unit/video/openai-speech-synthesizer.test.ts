import { OpenAiSpeechSynthesizer } from '@modules/video/infrastructure/openai-speech-synthesizer';

const CONFIG = { apiKey: 'sk-test', model: 'gpt-4o-mini-tts', baseUrl: 'https://api.test/v1' };

afterEach(() => jest.restoreAllMocks());

describe('OpenAiSpeechSynthesizer', () => {
  it('posts the text/voice/model and returns the audio buffer', async () => {
    const bytes = new Uint8Array([5, 6, 7]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => bytes.buffer,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const buf = await new OpenAiSpeechSynthesizer(CONFIG).synthesize('hello world', 'nova');

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(Array.from(buf)).toEqual([5, 6, 7]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/audio/speech');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: 'hello world',
      response_format: 'mp3',
    });
  });

  it('throws on a non-2xx response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;
    await expect(new OpenAiSpeechSynthesizer(CONFIG).synthesize('x', 'alloy')).rejects.toThrow(
      /HTTP 401/,
    );
  });
});
