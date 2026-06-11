import { PLATFORMS } from '@modules/connections/domain/platform';
import { GoogleOAuthProvider } from '@modules/connections/infrastructure/google-oauth-provider';
import { InstagramOAuthProvider } from '@modules/connections/infrastructure/instagram-oauth-provider';
import { buildProviderRegistry } from '@modules/connections/infrastructure/oauth-provider-registry';
import { StubOAuthProvider } from '@modules/connections/infrastructure/stub-oauth-provider';

describe('buildProviderRegistry', () => {
  it('uses the stub for every platform when no credentials are configured', () => {
    const registry = buildProviderRegistry();
    for (const platform of PLATFORMS) {
      expect(registry.get(platform)).toBeInstanceOf(StubOAuthProvider);
    }
  });

  it('wires the real Google provider for youtube when configured', () => {
    const registry = buildProviderRegistry({
      google: { clientId: 'id', clientSecret: 'secret' },
    });

    expect(registry.get('youtube')).toBeInstanceOf(GoogleOAuthProvider);
    expect(registry.get('facebook')).toBeInstanceOf(StubOAuthProvider);
    expect(registry.get('instagram')).toBeInstanceOf(StubOAuthProvider);
    expect(registry.get('tiktok')).toBeInstanceOf(StubOAuthProvider);
  });

  it('wires the real Instagram provider when configured', () => {
    const registry = buildProviderRegistry({
      instagram: { appId: 'id', appSecret: 'secret' },
    });

    expect(registry.get('instagram')).toBeInstanceOf(InstagramOAuthProvider);
    expect(registry.get('youtube')).toBeInstanceOf(StubOAuthProvider);
  });

  it('wires multiple real providers together', () => {
    const registry = buildProviderRegistry({
      google: { clientId: 'id', clientSecret: 'secret' },
      instagram: { appId: 'id', appSecret: 'secret' },
    });

    expect(registry.get('youtube')).toBeInstanceOf(GoogleOAuthProvider);
    expect(registry.get('instagram')).toBeInstanceOf(InstagramOAuthProvider);
    expect(registry.get('facebook')).toBeInstanceOf(StubOAuthProvider);
    expect(registry.get('tiktok')).toBeInstanceOf(StubOAuthProvider);
  });
});
