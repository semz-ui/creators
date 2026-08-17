import { Video } from '@modules/video/domain/video.entity';
import { InvalidVideoTransitionError } from '@modules/video/domain/video.errors';
import { Duration } from '@modules/video/domain/value-objects/duration';
import { Prompt } from '@modules/video/domain/value-objects/prompt';

function newVideo() {
  return Video.create({
    ownerId: 'user-1',
    prompt: Prompt.create('a cat'),
    duration: Duration.create(10),
    provider: 'sora',
  });
}

describe('Video entity', () => {
  it('is created queued with a UUID and timestamps', () => {
    const v = newVideo();
    expect(v.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(v.status).toBe('queued');
    expect(v.jobRef).toBeNull();
    expect(v.resultUrl).toBeNull();
    expect(v.createdAt).toBeInstanceOf(Date);
  });

  it('follows the happy path queued → processing → ready', () => {
    const v = newVideo();
    v.markProcessing('job-1');
    expect(v.status).toBe('processing');
    expect(v.jobRef).toBe('job-1');

    v.markReady('https://cdn/v.mp4');
    expect(v.status).toBe('ready');
    expect(v.resultUrl).toBe('https://cdn/v.mp4');
    expect(v.isTerminal()).toBe(true);
  });

  it('can fail from processing', () => {
    const v = newVideo();
    v.markProcessing('job-1');
    v.markFailed('boom');
    expect(v.status).toBe('failed');
    expect(v.error).toBe('boom');
  });

  it('rejects marking ready before processing', () => {
    expect(() => newVideo().markReady('x')).toThrow(InvalidVideoTransitionError);
  });

  it('rejects processing a non-queued video', () => {
    const v = newVideo();
    v.markProcessing('job-1');
    expect(() => v.markProcessing('job-2')).toThrow(InvalidVideoTransitionError);
  });

  it('rejects failing an already-ready video', () => {
    const v = newVideo();
    v.markProcessing('job-1');
    v.markReady('url');
    expect(() => v.markFailed('late')).toThrow(InvalidVideoTransitionError);
  });

  it('round-trips through a snapshot', () => {
    const v = newVideo();
    v.markProcessing('job-1');
    expect(Video.fromSnapshot(v.toSnapshot()).toSnapshot()).toEqual(v.toSnapshot());
  });
});
