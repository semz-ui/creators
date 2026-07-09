import { PLATFORMS } from '@modules/connections/domain/platform';
import { InstagramSocialPublisher } from '@modules/publishing/infrastructure/instagram-social-publisher';
import { buildPublisherRegistry } from '@modules/publishing/infrastructure/social-publisher-registry';
import { StubSocialPublisher } from '@modules/publishing/infrastructure/stub-social-publisher';
import { YouTubeSocialPublisher } from '@modules/publishing/infrastructure/youtube-social-publisher';

describe('buildPublisherRegistry', () => {
  it('uses the stub for every platform when nothing is configured', () => {
    const registry = buildPublisherRegistry();
    for (const platform of PLATFORMS) {
      expect(registry.get(platform)).toBeInstanceOf(StubSocialPublisher);
    }
  });

  it('wires the real YouTube publisher when configured', () => {
    const registry = buildPublisherRegistry({ youtube: { privacyStatus: 'private' } });

    expect(registry.get('youtube')).toBeInstanceOf(YouTubeSocialPublisher);
    expect(registry.get('facebook')).toBeInstanceOf(StubSocialPublisher);
    expect(registry.get('instagram')).toBeInstanceOf(StubSocialPublisher);
    expect(registry.get('tiktok')).toBeInstanceOf(StubSocialPublisher);
  });

  it('wires the real Instagram publisher when configured', () => {
    const registry = buildPublisherRegistry({ instagram: {} });

    expect(registry.get('instagram')).toBeInstanceOf(InstagramSocialPublisher);
    expect(registry.get('youtube')).toBeInstanceOf(StubSocialPublisher);
  });

  it('wires multiple real publishers together', () => {
    const registry = buildPublisherRegistry({
      youtube: { privacyStatus: 'private' },
      instagram: {},
    });

    expect(registry.get('youtube')).toBeInstanceOf(YouTubeSocialPublisher);
    expect(registry.get('instagram')).toBeInstanceOf(InstagramSocialPublisher);
    expect(registry.get('facebook')).toBeInstanceOf(StubSocialPublisher);
  });
});
