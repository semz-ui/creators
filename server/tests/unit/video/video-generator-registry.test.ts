import type { IVideoGenerator } from '@modules/video/domain/ports/video-generator';
import type { VideoProvider } from '@modules/video/domain/provider';
import { ProviderUnavailableError } from '@modules/video/domain/video.errors';
import { buildGeneratorRegistry } from '@modules/video/infrastructure/video-generator-registry';

function fakeGenerator(): IVideoGenerator {
  return { submit: jest.fn(), poll: jest.fn() };
}

function registryWith(providers: VideoProvider[], defaultProvider: VideoProvider) {
  return buildGeneratorRegistry({
    generators: new Map(providers.map((provider) => [provider, fakeGenerator()])),
    defaultProvider,
  });
}

describe('StaticVideoGeneratorRegistry', () => {
  it('reports only the registered providers as available', () => {
    const registry = registryWith(['stub', 'pika'], 'pika');

    expect(registry.isAvailable('pika')).toBe(true);
    expect(registry.isAvailable('sora')).toBe(false);
    expect(registry.isAvailable('kling')).toBe(false);
  });

  it('resolves a registered generator', () => {
    const registry = registryWith(['sora', 'pika'], 'sora');

    expect(registry.get('pika')).toBeDefined();
    expect(registry.get('sora')).not.toBe(registry.get('pika'));
  });

  it('throws rather than silently substituting when a provider is unconfigured', () => {
    const registry = registryWith(['stub'], 'stub');

    // Falling back to another generator here would bill the user for a video
    // made by something they didn't choose.
    expect(() => registry.get('kling')).toThrow(ProviderUnavailableError);
  });

  it('reports the configured default', () => {
    expect(registryWith(['stub', 'kling'], 'kling').defaultProvider()).toBe('kling');
  });
});
