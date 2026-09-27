import type { IVideoGeneratorRegistry } from '../domain/ports/video-generator';
import {
  PROVIDER_LABELS,
  PROVIDER_SUPPORTS_AUDIO,
  SELECTABLE_PROVIDERS,
  type VideoProvider,
} from '../domain/provider';

export interface ProviderInfo {
  id: VideoProvider;
  label: string;
  available: boolean;
  supportsAudio: boolean;
}

/**
 * Lists the providers a user can pick from and whether each is usable on this
 * deployment, so the client can show what's configured and disable the rest.
 * Pure read over the registry — no I/O, no credentials leave the server.
 */
export class ListVideoProviders {
  constructor(private readonly generators: IVideoGeneratorRegistry) {}

  execute(): ProviderInfo[] {
    return SELECTABLE_PROVIDERS.map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      available: this.generators.isAvailable(id),
      supportsAudio: PROVIDER_SUPPORTS_AUDIO[id],
    }));
  }
}
