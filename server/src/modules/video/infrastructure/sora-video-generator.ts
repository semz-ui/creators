import type {
  GenerationHandle,
  GenerationRequest,
  GenerationStatus,
  IVideoGenerator,
} from '../domain/ports/video-generator';
import type { IVideoStorage } from '../domain/ports/video-storage';

export interface SoraConfig {
  apiKey: string;
  /** Model id, e.g. sora-2 or sora-2-pro. */
  model: string;
  /** Output resolution, e.g. 1280x720 (1080p needs sora-2-pro). */
  size: string;
  /** API host, defaults to https://api.openai.com/v1. */
  baseUrl: string;
}

/**
 * OpenAI Sora implementation of {@link IVideoGenerator}.
 *
 * `submit` creates a video job and returns its id as the jobRef. `poll` checks
 * the job; on completion the finished MP4 is fetched (authenticated binary —
 * Sora gives no public URL) and handed to {@link IVideoStorage}, whose returned
 * URL becomes the video's resultUrl. The download+upload runs on the first
 * completed poll; a stable storage key (the jobRef) keeps concurrent
 * poll-on-read passes idempotent.
 */
export class SoraVideoGenerator implements IVideoGenerator {
  constructor(
    private readonly config: SoraConfig,
    private readonly storage: IVideoStorage,
  ) {}

  async submit(request: GenerationRequest): Promise<GenerationHandle> {
    const data = await this.call('POST', '/videos', {
      model: this.config.model,
      prompt: request.prompt,
      size: this.config.size,
      seconds: toSoraSeconds(request.durationSeconds),
    });

    const id = readString(data, 'id');
    if (!id) {
      throw new Error('Sora: create response missing id');
    }
    return { jobRef: id };
  }

  async poll(jobRef: string): Promise<GenerationStatus> {
    const data = await this.call('GET', `/videos/${jobRef}`);
    const status = readString(data, 'status');

    switch (status) {
      case 'queued':
      case 'in_progress':
        return { state: 'processing' };
      case 'completed': {
        const mp4 = await this.download(jobRef);
        const resultUrl = await this.storage.upload(mp4, jobRef, 'video/mp4');
        // jobRef is the Cloudinary public_id (see CloudinaryVideoStorage), so the
        // app can composite audio onto it.
        return { state: 'ready', resultUrl, assetId: jobRef };
      }
      case 'failed':
        return { state: 'failed', error: readError(data) ?? 'Generation failed' };
      default:
        // Unknown/absent status — treat as still running so we retry on next read.
        return { state: 'processing' };
    }
  }

  private async download(jobRef: string): Promise<Buffer> {
    const res = await fetch(`${this.config.baseUrl}/videos/${jobRef}/content?variant=video`, {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Sora: content download failed (HTTP ${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  private async call(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(`${this.config.baseUrl}${path}`, init);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Sora API error (HTTP ${res.status}): ${readError(json) ?? res.statusText}`);
    }
    return json;
  }
}

/** Sora supports 8s, 16s, or 20s clips; map our 5–60s request to the nearest up. */
export function toSoraSeconds(durationSeconds: number): '8' | '16' | '20' {
  if (durationSeconds <= 8) return '8';
  if (durationSeconds <= 16) return '16';
  return '20';
}

function readString(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Pull `error.message` from a Sora job/error payload. */
function readError(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const error = (obj as Record<string, unknown>).error;
  return readString(error, 'message');
}
