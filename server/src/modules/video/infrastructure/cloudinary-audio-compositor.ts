import { v2 as cloudinary } from 'cloudinary';

import { musicPublicId } from '../domain/audio';
import type { AudioCompositionInput, IAudioCompositor } from '../domain/ports/audio-compositor';
import type { ISpeechSynthesizer } from '../domain/ports/speech-synthesizer';
import type { IVideoStorage } from '../domain/ports/video-storage';

/** Cloudinary folder the videos/audio are uploaded under (see CloudinaryVideoStorage). */
const FOLDER = 'reelo';

/**
 * Composites audio onto a generated video using Cloudinary delivery
 * transformations (`l_audio` overlays) — no re-encoding on our side.
 *
 * Narration is synthesized via {@link ISpeechSynthesizer}, uploaded through
 * {@link IVideoStorage} (deterministic public_id → idempotent), then layered
 * over the base video together with the chosen library music track. The base
 * video's own (Sora) audio is ducked so the added audio is clear. Returns the
 * plain delivery URL when no audio is requested.
 *
 * Relies on the global Cloudinary SDK already being configured by
 * CloudinaryVideoStorage (constructed first in the module).
 */
export class CloudinaryAudioCompositor implements IAudioCompositor {
  constructor(
    private readonly speech: ISpeechSynthesizer,
    private readonly storage: IVideoStorage,
  ) {}

  async compose(input: AudioCompositionInput): Promise<string> {
    const baseId = `${FOLDER}/${input.baseAssetId}`;
    const steps: string[] = [];

    const musicId = input.musicTrackId ? musicPublicId(input.musicTrackId) : undefined;
    const hasNarration = Boolean(input.narration);

    if (!musicId && !hasNarration) {
      return this.deliver(baseId, '');
    }

    // Duck the base video's native audio so the overlays are audible.
    steps.push('e_volume:-40');

    if (musicId) {
      steps.push(`l_audio:${layerId(musicId)},e_volume:-20`);
      steps.push('fl_layer_apply');
    }

    if (input.narration) {
      const mp3 = await this.speech.synthesize(input.narration.text, input.narration.voice);
      // Deterministic key → re-runs overwrite the same asset (idempotent).
      await this.storage.upload(mp3, `${input.baseAssetId}-narration`, 'audio/mpeg');
      steps.push(`l_audio:${layerId(`${FOLDER}/${input.baseAssetId}-narration`)}`);
      steps.push('fl_layer_apply');
    }

    return this.deliver(baseId, steps.join('/'));
  }

  private deliver(publicId: string, rawTransformation: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      ...(rawTransformation ? { raw_transformation: rawTransformation } : {}),
    });
  }
}

/** Cloudinary overlay layer id: folders are `:`-separated, not `/`. */
function layerId(publicId: string): string {
  return publicId.replace(/\//g, ':');
}
