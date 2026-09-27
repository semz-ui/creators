import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type {
  GenerationHandle,
  GenerationRequest,
  GenerationStatus,
  IVideoGenerator,
} from '../domain/ports/video-generator';

const QUEUE_BASE = 'https://queue.fal.run';

export interface PikaConfig {
  /** fal API key (fal's own env var name is FAL_KEY). */
  apiKey: string;
  /** Full model id including sub-path, e.g. fal-ai/pika/v2.2/text-to-video. */
  model: string;
  /** Output aspect ratio, e.g. '16:9'. */
  aspectRatio: string;
  /** Output resolution: '720p' or '1080p'. */
  resolution: string;
}

/**
 * Pika implementation of {@link IVideoGenerator}, via fal.ai's queue API.
 *
 * `submit` enqueues a text-to-video request and returns fal's `request_id` as
 * the jobRef; `poll` checks that request and, once COMPLETED, fetches the
 * result for its hosted video URL. Like Kling (and unlike Sora) the output stays
 * on the provider's CDN, so no `assetId` is returned and audio can't be
 * composited onto it — see PROVIDER_SUPPORTS_AUDIO.
 *
 * The result arrives via poll-on-read; the generation callback is unused here.
 */
export class PikaVideoGenerator implements IVideoGenerator {
  private readonly queueRoot: string;

  constructor(private readonly config: PikaConfig) {
    this.queueRoot = `${QUEUE_BASE}/${toQueueBase(config.model)}`;
  }

  async submit(request: GenerationRequest): Promise<GenerationHandle> {
    // Submitting uses the full model path, including the sub-path.
    const data = await this.call('POST', `${QUEUE_BASE}/${this.config.model}`, {
      prompt: request.prompt,
      duration: toPikaDuration(request.durationSeconds),
      aspect_ratio: this.config.aspectRatio,
      resolution: this.config.resolution,
    });

    const requestId = readString(data, 'request_id');
    if (!requestId) {
      throw new Error('Pika: submit response missing request_id');
    }
    return { jobRef: requestId };
  }

  async poll(jobRef: string): Promise<GenerationStatus> {
    const encoded = encodeURIComponent(jobRef);
    const data = await this.call('GET', `${this.queueRoot}/requests/${encoded}/status`);
    const status = readString(data, 'status');

    switch (status) {
      case 'IN_QUEUE':
      case 'IN_PROGRESS':
        return { state: 'processing' };
      case 'COMPLETED': {
        // The status payload carries no output — fetch the result separately.
        const result = await this.call('GET', `${this.queueRoot}/requests/${encoded}`);
        const url = readVideoUrl(result);
        return url
          ? { state: 'ready', resultUrl: url }
          : { state: 'failed', error: 'Pika: completed request returned no video url' };
      }
      default:
        // Unknown/absent status — treat as still running so we retry on next read.
        return { state: 'processing' };
    }
  }

  private async call(
    method: 'GET' | 'POST',
    url: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetchWithTimeout(url, init);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Pika API error (HTTP ${res.status}): ${readError(json) ?? res.statusText}`);
    }
    return json;
  }
}

/**
 * fal's status and result endpoints drop the model's sub-path: a request
 * submitted to `fal-ai/pika/v2.2/text-to-video` is polled at
 * `fal-ai/pika/requests/{id}/status`. Only the namespace and app name survive.
 */
export function toQueueBase(model: string): string {
  const [namespace, app] = model.split('/');
  if (!namespace || !app) {
    throw new Error(`Pika: model id must be "<namespace>/<app>[/<path>]", got "${model}"`);
  }
  return `${namespace}/${app}`;
}

/** Pika accepts 5–10s clips; clamp our 5–60s request into that range. */
export function toPikaDuration(durationSeconds: number): number {
  if (durationSeconds <= 5) return 5;
  return durationSeconds >= 10 ? 10 : Math.round(durationSeconds);
}

/** Read a string field from an unknown object, or undefined. */
function readString(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Pull `video.url` from a fal result payload. */
function readVideoUrl(result: unknown): string | undefined {
  if (typeof result !== 'object' || result === null) return undefined;
  return readString((result as Record<string, unknown>).video, 'url');
}

/**
 * fal reports errors as a `detail` that is either a string or a list of
 * validation objects — flatten either into one message.
 */
function readError(json: Record<string, unknown>): string | undefined {
  const detail = json.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => readString(item, 'msg'))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join('; ');
  }
  return readString(json, 'message');
}
