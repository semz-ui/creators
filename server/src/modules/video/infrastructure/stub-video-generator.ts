import { randomUUID } from 'node:crypto';

import type {
  GenerationHandle,
  GenerationRequest,
  IVideoGenerator,
} from '../domain/ports/video-generator';

/**
 * Placeholder generator: accepts the job and returns a reference, but does no
 * real work. The live AI provider drops in behind {@link IVideoGenerator} later;
 * completion arrives through the generation callback either way.
 */
export class StubVideoGenerator implements IVideoGenerator {
  async submit(_request: GenerationRequest): Promise<GenerationHandle> {
    return { jobRef: `stub-${randomUUID()}` };
  }
}
