import { randomUUID } from 'node:crypto';

import type {
  GenerationHandle,
  GenerationRequest,
  GenerationStatus,
  IVideoGenerator,
} from '../domain/ports/video-generator';

/**
 * Placeholder generator: accepts the job and returns a reference, but does no
 * real work. The live AI provider drops in behind {@link IVideoGenerator}
 * (see {@link KlingVideoGenerator}); completion arrives through the generation
 * callback either way. `poll` reports `processing` forever — the stub never
 * self-completes, so the callback remains the way a stubbed job finishes.
 */
export class StubVideoGenerator implements IVideoGenerator {
  async submit(_request: GenerationRequest): Promise<GenerationHandle> {
    return { jobRef: `stub-${randomUUID()}` };
  }

  async poll(_jobRef: string): Promise<GenerationStatus> {
    return { state: 'processing' };
  }
}
