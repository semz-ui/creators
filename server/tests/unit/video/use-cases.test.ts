import { ApplyGenerationResult } from '@modules/video/application/apply-generation-result.usecase';
import { CreateVideo } from '@modules/video/application/create-video.usecase';
import { GetVideo } from '@modules/video/application/get-video.usecase';
import { ListVideos } from '@modules/video/application/list-videos.usecase';
import type { IVideoGenerator } from '@modules/video/domain/ports/video-generator';
import type { IVideoRepository } from '@modules/video/domain/ports/video-repository';
import { Video } from '@modules/video/domain/video.entity';
import { VideoNotFoundError } from '@modules/video/domain/video.errors';
import { Duration } from '@modules/video/domain/value-objects/duration';
import { Prompt } from '@modules/video/domain/value-objects/prompt';

function repoMock() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByJobRef: jest.fn(),
    findByOwner: jest.fn(),
  } satisfies Record<keyof IVideoRepository, jest.Mock>;
}

function processingVideo(ownerId = 'user-1') {
  const v = Video.create({
    ownerId,
    prompt: Prompt.create('a cat'),
    duration: Duration.create(10),
  });
  v.markProcessing('job-1');
  return v;
}

describe('CreateVideo', () => {
  it('submits to the generator and persists a processing video', async () => {
    const videos = repoMock();
    const generator: IVideoGenerator = {
      submit: jest.fn().mockResolvedValue({ jobRef: 'job-xyz' }),
    };

    const result = await new CreateVideo(videos, generator).execute('user-1', {
      prompt: 'a cat',
      durationSeconds: 10,
    });

    expect(generator.submit).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'a cat', durationSeconds: 10 }),
    );
    expect(videos.save).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('processing');
  });

  it('does not persist when the generator submission fails', async () => {
    const videos = repoMock();
    const generator: IVideoGenerator = {
      submit: jest.fn().mockRejectedValue(new Error('provider down')),
    };

    await expect(
      new CreateVideo(videos, generator).execute('user-1', {
        prompt: 'a cat',
        durationSeconds: 10,
      }),
    ).rejects.toThrow('provider down');
    expect(videos.save).not.toHaveBeenCalled();
  });

  it('rejects an invalid duration before doing any work', async () => {
    const videos = repoMock();
    const generator: IVideoGenerator = { submit: jest.fn() };

    await expect(
      new CreateVideo(videos, generator).execute('user-1', {
        prompt: 'a cat',
        durationSeconds: 999,
      }),
    ).rejects.toThrow();
    expect(generator.submit).not.toHaveBeenCalled();
  });
});

describe('GetVideo', () => {
  it('returns the video when owned', async () => {
    const videos = repoMock();
    const v = processingVideo('user-1');
    videos.findById.mockResolvedValue(v);

    const result = await new GetVideo(videos).execute('user-1', v.id);
    expect(result.id).toBe(v.id);
  });

  it('404s when missing', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(null);
    await expect(new GetVideo(videos).execute('user-1', 'x')).rejects.toThrow(VideoNotFoundError);
  });

  it('404s when owned by someone else', async () => {
    const videos = repoMock();
    videos.findById.mockResolvedValue(processingVideo('other-user'));
    await expect(new GetVideo(videos).execute('user-1', 'x')).rejects.toThrow(VideoNotFoundError);
  });
});

describe('ListVideos', () => {
  it('computes skip and returns a page envelope', async () => {
    const videos = repoMock();
    videos.findByOwner.mockResolvedValue({ items: [processingVideo()], total: 7 });

    const result = await new ListVideos(videos).execute('user-1', { page: 3, limit: 2 });

    expect(videos.findByOwner).toHaveBeenCalledWith('user-1', { limit: 2, skip: 4 });
    expect(result).toMatchObject({ page: 3, limit: 2, total: 7 });
    expect(result.items).toHaveLength(1);
  });
});

describe('ApplyGenerationResult', () => {
  it('marks a processing video ready', async () => {
    const videos = repoMock();
    const v = processingVideo();
    videos.findByJobRef.mockResolvedValue(v);

    await new ApplyGenerationResult(videos).execute({
      jobRef: 'job-1',
      status: 'ready',
      resultUrl: 'https://cdn/v.mp4',
    });

    expect(v.status).toBe('ready');
    expect(videos.save).toHaveBeenCalledWith(v);
  });

  it('marks a processing video failed', async () => {
    const videos = repoMock();
    const v = processingVideo();
    videos.findByJobRef.mockResolvedValue(v);

    await new ApplyGenerationResult(videos).execute({
      jobRef: 'job-1',
      status: 'failed',
      error: 'nope',
    });

    expect(v.status).toBe('failed');
  });

  it('is a no-op for an unknown jobRef', async () => {
    const videos = repoMock();
    videos.findByJobRef.mockResolvedValue(null);

    await new ApplyGenerationResult(videos).execute({
      jobRef: 'ghost',
      status: 'ready',
      resultUrl: 'u',
    });
    expect(videos.save).not.toHaveBeenCalled();
  });

  it('ignores a duplicate callback once terminal (idempotent)', async () => {
    const videos = repoMock();
    const v = processingVideo();
    v.markReady('https://cdn/v.mp4');
    videos.findByJobRef.mockResolvedValue(v);

    await new ApplyGenerationResult(videos).execute({
      jobRef: 'job-1',
      status: 'failed',
      error: 'late',
    });

    expect(v.status).toBe('ready');
    expect(videos.save).not.toHaveBeenCalled();
  });
});
