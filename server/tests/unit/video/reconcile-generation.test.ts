import type { ApplyGenerationResult } from '@modules/video/application/apply-generation-result.usecase';
import { ReconcileGeneration } from '@modules/video/application/reconcile-generation.usecase';
import type {
  GenerationStatus,
  IVideoGenerator,
  IVideoGeneratorRegistry,
} from '@modules/video/domain/ports/video-generator';
import type { VideoProvider } from '@modules/video/domain/provider';
import type { IVideoRepository } from '@modules/video/domain/ports/video-repository';
import { Video } from '@modules/video/domain/video.entity';
import { Duration } from '@modules/video/domain/value-objects/duration';
import { Prompt } from '@modules/video/domain/value-objects/prompt';

function repoMock() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByJobRef: jest.fn(),
    claimTerminal: jest.fn(),
    findByOwner: jest.fn(),
  } satisfies Record<keyof IVideoRepository, jest.Mock>;
}

function generatorMock(status: GenerationStatus) {
  return {
    submit: jest.fn(),
    poll: jest.fn().mockResolvedValue(status),
  } satisfies Record<keyof IVideoGenerator, jest.Mock>;
}

/**
 * Wrap a single generator as a registry — the shape the use cases now take.
 * `available: false` simulates a provider with no credentials configured.
 */
function registryOf(
  generator: IVideoGenerator,
  options: { available?: boolean; defaultProvider?: VideoProvider } = {},
) {
  return {
    get: jest.fn().mockReturnValue(generator),
    isAvailable: jest.fn().mockReturnValue(options.available ?? true),
    defaultProvider: jest.fn().mockReturnValue(options.defaultProvider ?? 'sora'),
  } satisfies Record<keyof IVideoGeneratorRegistry, jest.Mock>;
}

function applyResultMock() {
  return { execute: jest.fn().mockResolvedValue(undefined) };
}

function asApply(mock: ReturnType<typeof applyResultMock>): ApplyGenerationResult {
  return mock as unknown as ApplyGenerationResult;
}

function processingVideo(
  ownerId = 'user-1',
  jobRef = 'job-1',
  audio: { musicTrackId?: string; narrationText?: string; narrationVoice?: string } = {},
) {
  const v = Video.create({
    ownerId,
    prompt: Prompt.create('a cat'),
    duration: Duration.create(10),
    provider: 'sora',
    musicTrackId: audio.musicTrackId ?? null,
    narrationText: audio.narrationText ?? null,
    narrationVoice: audio.narrationVoice ?? null,
  });
  v.markProcessing(jobRef);
  return v;
}

function compositorMock(url = 'https://cdn/composed.mp4') {
  return { compose: jest.fn().mockResolvedValue(url) };
}

describe('ReconcileGeneration provider resolution', () => {
  it('polls the generator that accepted the job, not the current default', async () => {
    const video = Video.create({
      ownerId: 'user-1',
      prompt: Prompt.create('a cat'),
      duration: Duration.create(10),
      provider: 'pika',
    });
    video.markProcessing('job-1');
    const videos = repoMock();
    videos.findById.mockResolvedValue(video);
    const generator = generatorMock({ state: 'processing' });
    const registry = registryOf(generator, { defaultProvider: 'sora' });

    await new ReconcileGeneration(videos, registry, asApply(applyResultMock())).execute(
      'user-1',
      video.id,
    );

    expect(registry.get).toHaveBeenCalledWith('pika');
  });

  it('falls back to the default for rows written before providers were selectable', async () => {
    const video = Video.fromSnapshot({
      ...processingVideo().toSnapshot(),
      provider: null,
    });
    const videos = repoMock();
    videos.findById.mockResolvedValue(video);
    const generator = generatorMock({ state: 'processing' });
    const registry = registryOf(generator, { defaultProvider: 'kling' });

    await new ReconcileGeneration(videos, registry, asApply(applyResultMock())).execute(
      'user-1',
      video.id,
    );

    expect(registry.get).toHaveBeenCalledWith('kling');
  });
});

describe('ReconcileGeneration', () => {
  it('applies a ready result when the generator reports success', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo());
    const generator = generatorMock({ state: 'ready', resultUrl: 'https://cdn/v.mp4' });
    const apply = applyResultMock();

    await new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
      'user-1',
      'vid-1',
    );

    expect(generator.poll).toHaveBeenCalledWith('job-1');
    expect(apply.execute).toHaveBeenCalledWith({
      jobRef: 'job-1',
      status: 'ready',
      resultUrl: 'https://cdn/v.mp4',
    });
  });

  it('composites audio and applies the composed url when the video has audio + assetId', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(
      processingVideo('user-1', 'job-1', { musicTrackId: 'upbeat', narrationText: 'hi' }),
    );
    const generator = generatorMock({
      state: 'ready',
      resultUrl: 'https://cdn/base.mp4',
      assetId: 'asset-1',
    });
    const apply = applyResultMock();
    const compositor = compositorMock('https://cdn/composed.mp4');

    await new ReconcileGeneration(
      videos,
      registryOf(generator),
      asApply(apply),
      compositor,
    ).execute('user-1', 'vid-1');

    expect(compositor.compose).toHaveBeenCalledWith({
      baseAssetId: 'asset-1',
      musicTrackId: 'upbeat',
      narration: { text: 'hi', voice: 'alloy' },
    });
    expect(apply.execute).toHaveBeenCalledWith({
      jobRef: 'job-1',
      status: 'ready',
      resultUrl: 'https://cdn/composed.mp4',
    });
  });

  it('skips compositing when the video has no audio settings', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo());
    const generator = generatorMock({
      state: 'ready',
      resultUrl: 'https://cdn/base.mp4',
      assetId: 'asset-1',
    });
    const apply = applyResultMock();
    const compositor = compositorMock();

    await new ReconcileGeneration(
      videos,
      registryOf(generator),
      asApply(apply),
      compositor,
    ).execute('user-1', 'vid-1');

    expect(compositor.compose).not.toHaveBeenCalled();
    expect(apply.execute).toHaveBeenCalledWith({
      jobRef: 'job-1',
      status: 'ready',
      resultUrl: 'https://cdn/base.mp4',
    });
  });

  it('skips compositing when the generator returns no assetId (not our storage)', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(
      processingVideo('user-1', 'job-1', { musicTrackId: 'upbeat' }),
    );
    const generator = generatorMock({ state: 'ready', resultUrl: 'https://remote/v.mp4' });
    const apply = applyResultMock();
    const compositor = compositorMock();

    await new ReconcileGeneration(
      videos,
      registryOf(generator),
      asApply(apply),
      compositor,
    ).execute('user-1', 'vid-1');

    expect(compositor.compose).not.toHaveBeenCalled();
    expect(apply.execute).toHaveBeenCalledWith({
      jobRef: 'job-1',
      status: 'ready',
      resultUrl: 'https://remote/v.mp4',
    });
  });

  it('applies a failed result with the provider error', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo());
    const generator = generatorMock({ state: 'failed', error: 'nsfw blocked' });
    const apply = applyResultMock();

    await new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
      'user-1',
      'vid-1',
    );

    expect(apply.execute).toHaveBeenCalledWith({
      jobRef: 'job-1',
      status: 'failed',
      error: 'nsfw blocked',
    });
  });

  it('does nothing while the job is still processing', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo());
    const generator = generatorMock({ state: 'processing' });
    const apply = applyResultMock();

    await new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
      'user-1',
      'vid-1',
    );

    expect(apply.execute).not.toHaveBeenCalled();
  });

  it('is a no-op when the video is not the caller’s', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo('someone-else'));
    const generator = generatorMock({ state: 'ready', resultUrl: 'x' });
    const apply = applyResultMock();

    await new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
      'user-1',
      'vid-1',
    );

    expect(generator.poll).not.toHaveBeenCalled();
    expect(apply.execute).not.toHaveBeenCalled();
  });

  it('is a no-op for a video that is not processing', async () => {
    const videos = repoMock();
    const ready = processingVideo();
    ready.markReady('https://cdn/done.mp4');
    videos.findById.mockResolvedValue(ready);
    const generator = generatorMock({ state: 'ready', resultUrl: 'x' });
    const apply = applyResultMock();

    await new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
      'user-1',
      'vid-1',
    );

    expect(generator.poll).not.toHaveBeenCalled();
  });

  it('swallows provider errors so the read still succeeds', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo());
    const generator = generatorMock({ state: 'processing' });
    generator.poll.mockRejectedValue(new Error('kling timeout'));
    const apply = applyResultMock();

    await expect(
      new ReconcileGeneration(videos, registryOf(generator), asApply(apply)).execute(
        'user-1',
        'vid-1',
      ),
    ).resolves.toBeUndefined();
    expect(apply.execute).not.toHaveBeenCalled();
  });
});
