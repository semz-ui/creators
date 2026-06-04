import { CreatePublication } from '@modules/publishing/application/create-publication.usecase';
import { DistributionService } from '@modules/publishing/application/distribution.service';
import { RunDuePublications } from '@modules/publishing/application/run-due-publications.usecase';
import {
  NoActiveConnectionError,
  VideoNotPublishableError,
} from '@modules/publishing/domain/publication.errors';
import type { IConnectionTokenProvider } from '@modules/publishing/domain/ports/connection-token-provider';
import type { IPublicationRepository } from '@modules/publishing/domain/ports/publication-repository';
import type { IReadyVideoLookup } from '@modules/publishing/domain/ports/ready-video-lookup';
import type { ISocialPublisherRegistry } from '@modules/publishing/domain/ports/social-publisher';
import { Publication } from '@modules/publishing/domain/publication.entity';

function repoMock() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByOwner: jest.fn(),
    findDue: jest.fn(),
    claimForDistribution: jest.fn().mockResolvedValue(true),
  } satisfies Record<keyof IPublicationRepository, jest.Mock>;
}

function videoLookup(url: string | null): IReadyVideoLookup {
  return { getReadyVideo: jest.fn().mockResolvedValue(url ? { videoUrl: url } : null) };
}

// `map` is platform -> active connectionId (or null). getActiveConnection
// resolves by platform (creation time); getActiveConnectionById resolves by the
// captured connection id (distribution time), active iff it is in the map.
function connectionTokens(map: Record<string, string | null>): IConnectionTokenProvider {
  const activeIds = new Set(Object.values(map).filter((id): id is string => id !== null));
  return {
    getActiveConnection: jest.fn().mockImplementation((_userId: string, platform: string) => {
      const id = map[platform];
      return Promise.resolve(id ? { connectionId: id, accessToken: `tok-${platform}` } : null);
    }),
    getActiveConnectionById: jest
      .fn()
      .mockImplementation((_userId: string, connectionId: string) =>
        Promise.resolve(
          activeIds.has(connectionId) ? { connectionId, accessToken: `tok-${connectionId}` } : null,
        ),
      ),
  };
}

function publishers(fail = false): ISocialPublisherRegistry {
  return {
    get: jest.fn().mockReturnValue({
      publish: fail
        ? jest.fn().mockRejectedValue(new Error('boom'))
        : jest.fn().mockResolvedValue({ externalPostId: 'ext-1' }),
    }),
  };
}

describe('DistributionService', () => {
  it('publishes each target with an active connection', async () => {
    const pub = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: null,
      targets: [
        { platform: 'facebook', connectionId: 'c-fb' },
        { platform: 'youtube', connectionId: 'c-yt' },
      ],
    });
    const service = new DistributionService(
      videoLookup('https://cdn/v.mp4'),
      connectionTokens({ facebook: 'c-fb', youtube: 'c-yt' }),
      publishers(),
    );

    await service.distribute(pub);
    expect(pub.status).toBe('completed');
  });

  it('marks targets without a connection as failed (partially_failed)', async () => {
    const pub = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: null,
      targets: [
        { platform: 'facebook', connectionId: 'c-fb' },
        { platform: 'youtube', connectionId: 'c-yt' },
      ],
    });
    const service = new DistributionService(
      videoLookup('https://cdn/v.mp4'),
      connectionTokens({ facebook: 'c-fb', youtube: null }),
      publishers(),
    );

    await service.distribute(pub);
    expect(pub.status).toBe('partially_failed');
  });

  it('fails all targets when the video is gone', async () => {
    const pub = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: null,
      targets: [{ platform: 'facebook', connectionId: 'c-fb' }],
    });
    const service = new DistributionService(videoLookup(null), connectionTokens({}), publishers());

    await service.distribute(pub);
    expect(pub.status).toBe('failed');
  });

  it('binds to the captured connectionId, not the current active connection', async () => {
    const pub = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: null,
      targets: [{ platform: 'facebook', connectionId: 'c-old' }],
    });
    // The user has since switched accounts: only c-new is active now.
    const connections = connectionTokens({ facebook: 'c-new' });
    const service = new DistributionService(
      videoLookup('https://cdn/v.mp4'),
      connections,
      publishers(),
    );

    await service.distribute(pub);

    // Looked up by the captured id (c-old), never re-resolved by platform.
    expect(connections.getActiveConnectionById).toHaveBeenCalledWith('u1', 'c-old');
    expect(connections.getActiveConnection).not.toHaveBeenCalled();
    // c-old is no longer active, so the target fails rather than posting to c-new.
    expect(pub.status).toBe('failed');
  });
});

describe('CreatePublication', () => {
  function build(opts: { videoUrl: string | null; connections: Record<string, string | null> }) {
    const repo = repoMock();
    const videos = videoLookup(opts.videoUrl);
    const connections = connectionTokens(opts.connections);
    const distribution = new DistributionService(videos, connections, publishers());
    const useCase = new CreatePublication(repo, videos, connections, distribution);
    return { repo, useCase };
  }

  it('distributes immediately and returns completed', async () => {
    const { repo, useCase } = build({
      videoUrl: 'https://cdn/v.mp4',
      connections: { facebook: 'c-fb' },
    });

    const result = await useCase.execute('u1', { videoId: 'v1', platforms: ['facebook'] });

    expect(result.status).toBe('completed');
    expect(result.targets[0]).toMatchObject({ platform: 'facebook', status: 'published' });
    // Persisted before distributing and again with the final target states.
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('stores a future-scheduled publication without distributing', async () => {
    const { repo, useCase } = build({
      videoUrl: 'https://cdn/v.mp4',
      connections: { facebook: 'c-fb' },
    });
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();

    const result = await useCase.execute('u1', {
      videoId: 'v1',
      platforms: ['facebook'],
      scheduledAt,
    });

    expect(result.status).toBe('scheduled');
    expect(result.targets[0]?.status).toBe('pending');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects when the video is not ready', async () => {
    const { repo, useCase } = build({ videoUrl: null, connections: { facebook: 'c-fb' } });
    await expect(useCase.execute('u1', { videoId: 'v1', platforms: ['facebook'] })).rejects.toThrow(
      VideoNotPublishableError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects when a platform has no active connection', async () => {
    const { repo, useCase } = build({
      videoUrl: 'https://cdn/v.mp4',
      connections: { facebook: null },
    });
    await expect(useCase.execute('u1', { videoId: 'v1', platforms: ['facebook'] })).rejects.toThrow(
      NoActiveConnectionError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('RunDuePublications', () => {
  it('distributes and saves each due publication', async () => {
    const repo = repoMock();
    const due = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: new Date(Date.now() + 1000),
      targets: [{ platform: 'facebook', connectionId: 'c-fb' }],
    });
    repo.findDue.mockResolvedValue([due]);
    const distribution = {
      distribute: jest.fn().mockResolvedValue(undefined),
    } as unknown as DistributionService;

    const result = await new RunDuePublications(repo, distribution).execute(new Date());

    expect(distribution.distribute).toHaveBeenCalledWith(due);
    expect(repo.save).toHaveBeenCalledWith(due);
    expect(result.processed).toBe(1);
  });

  it('skips a publication it loses the claim on (never double-distributes)', async () => {
    const repo = repoMock();
    const due = Publication.create({
      userId: 'u1',
      videoId: 'v1',
      caption: null,
      scheduledAt: new Date(Date.now() + 1000),
      targets: [{ platform: 'facebook', connectionId: 'c-fb' }],
    });
    repo.findDue.mockResolvedValue([due]);
    repo.claimForDistribution.mockResolvedValue(false);
    const distribution = {
      distribute: jest.fn().mockResolvedValue(undefined),
    } as unknown as DistributionService;

    const result = await new RunDuePublications(repo, distribution).execute(new Date());

    expect(distribution.distribute).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });
});
