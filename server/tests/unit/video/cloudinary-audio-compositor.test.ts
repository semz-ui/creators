import { v2 as cloudinary } from 'cloudinary';

import { CloudinaryAudioCompositor } from '@modules/video/infrastructure/cloudinary-audio-compositor';
import type { ISpeechSynthesizer } from '@modules/video/domain/ports/speech-synthesizer';
import type { IVideoStorage } from '@modules/video/domain/ports/video-storage';

jest.mock('cloudinary', () => ({
  v2: {
    url: jest.fn(
      (id: string, opts: { raw_transformation?: string }) =>
        `URL(${id}|${opts.raw_transformation ?? ''})`,
    ),
  },
}));

const url = cloudinary.url as unknown as jest.Mock;

function synthMock() {
  return { synthesize: jest.fn().mockResolvedValue(Buffer.from([1, 2])) } satisfies Record<
    keyof ISpeechSynthesizer,
    jest.Mock
  >;
}
function storageMock() {
  return {
    upload: jest.fn().mockResolvedValue('https://cdn/narration.mp3'),
    uploadWithMetadata: jest
      .fn()
      .mockResolvedValue({ url: 'https://cdn/narration.mp3', durationSeconds: 10 }),
  } satisfies Record<keyof IVideoStorage, jest.Mock>;
}

/** The raw_transformation passed to cloudinary.url on the last call. */
function lastTransformation(): string {
  const call = url.mock.calls.at(-1)!;
  return (call[1] as { raw_transformation?: string }).raw_transformation ?? '';
}

afterEach(() => jest.clearAllMocks());

describe('CloudinaryAudioCompositor', () => {
  it('returns the plain base delivery URL when no audio is requested', async () => {
    const synth = synthMock();
    const compositor = new CloudinaryAudioCompositor(synth, storageMock());

    await compositor.compose({ baseAssetId: 'asset1' });

    expect(url).toHaveBeenCalledWith(
      'reelo/asset1',
      expect.objectContaining({ resource_type: 'video' }),
    );
    expect(lastTransformation()).toBe('');
    expect(synth.synthesize).not.toHaveBeenCalled();
  });

  it('overlays a library music track (ducking the base) without TTS', async () => {
    const synth = synthMock();
    const storage = storageMock();
    const compositor = new CloudinaryAudioCompositor(synth, storage);

    await compositor.compose({ baseAssetId: 'asset1', musicTrackId: 'upbeat' });

    const t = lastTransformation();
    expect(t).toContain('e_volume:-40'); // base ducked
    expect(t).toContain('l_audio:reelo:music:upbeat'); // music overlay (folders -> ':')
    expect(t).toContain('fl_layer_apply');
    expect(synth.synthesize).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('synthesizes narration, uploads it, and overlays it', async () => {
    const synth = synthMock();
    const storage = storageMock();
    const compositor = new CloudinaryAudioCompositor(synth, storage);

    await compositor.compose({
      baseAssetId: 'asset1',
      narration: { text: 'hello there', voice: 'nova' },
    });

    expect(synth.synthesize).toHaveBeenCalledWith('hello there', 'nova');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      'asset1-narration',
      'audio/mpeg',
    );
    expect(lastTransformation()).toContain('l_audio:reelo:asset1-narration');
  });

  it('layers both music and narration', async () => {
    const compositor = new CloudinaryAudioCompositor(synthMock(), storageMock());
    await compositor.compose({
      baseAssetId: 'asset1',
      musicTrackId: 'calm',
      narration: { text: 'hi', voice: 'alloy' },
    });
    const t = lastTransformation();
    expect(t).toContain('l_audio:reelo:music:calm');
    expect(t).toContain('l_audio:reelo:asset1-narration');
  });
});
