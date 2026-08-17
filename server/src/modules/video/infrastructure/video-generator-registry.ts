import { ProviderUnavailableError } from '../domain/video.errors';
import type { IVideoGenerator, IVideoGeneratorRegistry } from '../domain/ports/video-generator';
import type { VideoProvider } from '../domain/provider';

/**
 * Looks up the generator for a provider from a fixed map.
 *
 * Unlike the publishing and connections registries there is no per-provider
 * stub fallback: a provider with no credentials is simply absent from the map.
 * That absence is what `isAvailable` reports to the client, and it's why a
 * missing provider must raise rather than silently generate a fake video.
 */
export class StaticVideoGeneratorRegistry implements IVideoGeneratorRegistry {
  constructor(
    private readonly generators: Map<VideoProvider, IVideoGenerator>,
    private readonly fallback: VideoProvider,
  ) {}

  get(provider: VideoProvider): IVideoGenerator {
    const generator = this.generators.get(provider);
    if (!generator) {
      throw new ProviderUnavailableError(provider);
    }
    return generator;
  }

  isAvailable(provider: VideoProvider): boolean {
    return this.generators.has(provider);
  }

  defaultProvider(): VideoProvider {
    return this.fallback;
  }
}

export interface GeneratorRegistryConfig {
  /** Generators to register, keyed by provider. Absent = unavailable. */
  generators: Map<VideoProvider, IVideoGenerator>;
  /** Provider used when a request doesn't name one. */
  defaultProvider: VideoProvider;
}

export function buildGeneratorRegistry({
  generators,
  defaultProvider,
}: GeneratorRegistryConfig): StaticVideoGeneratorRegistry {
  return new StaticVideoGeneratorRegistry(generators, defaultProvider);
}
