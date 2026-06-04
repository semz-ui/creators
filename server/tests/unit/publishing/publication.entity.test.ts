import { Publication, type NewTarget } from '@modules/publishing/domain/publication.entity';

const targets: NewTarget[] = [
  { platform: 'facebook', connectionId: 'c-fb' },
  { platform: 'youtube', connectionId: 'c-yt' },
];

function newPublication(scheduledAt: Date | null = null) {
  return Publication.create({
    userId: 'user-1',
    videoId: 'vid-1',
    caption: 'hello',
    scheduledAt,
    targets,
  });
}

describe('Publication entity', () => {
  it('is created publishing (immediate) when no future schedule', () => {
    const p = newPublication();
    expect(p.status).toBe('publishing');
    expect(p.scheduledAt).toBeNull();
    expect(p.targets).toHaveLength(2);
    expect(p.targets.every((t) => t.status === 'pending')).toBe(true);
  });

  it('is created scheduled when scheduledAt is in the future', () => {
    const future = new Date(Date.now() + 60_000);
    const p = newPublication(future);
    expect(p.status).toBe('scheduled');
    expect(p.isDue(new Date())).toBe(false);
    expect(p.isDue(new Date(Date.now() + 120_000))).toBe(true);
  });

  it('treats a past scheduledAt as immediate', () => {
    const p = newPublication(new Date(Date.now() - 60_000));
    expect(p.status).toBe('publishing');
    expect(p.scheduledAt).toBeNull();
  });

  it('derives completed when all targets published', () => {
    const p = newPublication();
    p.markTargetPublished('facebook', 'fb-1');
    p.markTargetPublished('youtube', 'yt-1');
    p.recomputeStatus();
    expect(p.status).toBe('completed');
  });

  it('derives failed when all targets failed', () => {
    const p = newPublication();
    p.markTargetFailed('facebook', 'x');
    p.markTargetFailed('youtube', 'x');
    p.recomputeStatus();
    expect(p.status).toBe('failed');
  });

  it('derives partially_failed on a mix', () => {
    const p = newPublication();
    p.markTargetPublished('facebook', 'fb-1');
    p.markTargetFailed('youtube', 'x');
    p.recomputeStatus();
    expect(p.status).toBe('partially_failed');
  });

  it('round-trips through a snapshot', () => {
    const p = newPublication(new Date(Date.now() + 60_000));
    expect(Publication.fromSnapshot(p.toSnapshot()).toSnapshot()).toEqual(p.toSnapshot());
  });
});
