import jwt from 'jsonwebtoken';

import type {
  GenerationHandle,
  GenerationRequest,
  GenerationStatus,
  IVideoGenerator,
} from '../domain/ports/video-generator';

export interface KlingConfig {
  accessKey: string;
  secretKey: string;
  /** API host, e.g. https://api-singapore.klingai.com */
  baseUrl: string;
  /** Model version, e.g. kling-v1, kling-v1-6, kling-v2-master. */
  modelName: string;
  /** Generation mode: 'std' (faster/cheaper) or 'pro' (higher quality). */
  mode: string;
  /** Output aspect ratio: '16:9', '9:16', or '1:1'. */
  aspectRatio: string;
}

/** Kling signs requests with a short-lived JWT; it expires after 30 minutes. */
const TOKEN_TTL_SECONDS = 1800;

/** Shape of the Kling envelope we rely on (extra fields ignored). */
interface KlingEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
}

/**
 * Kling AI implementation of {@link IVideoGenerator} (official text-to-video API).
 *
 * Auth is a per-request HS256 JWT signed from the Access Key (`iss`) + Secret Key.
 * `submit` creates a text2video task and returns its `task_id` as the jobRef;
 * `poll` queries that task and maps Kling's status to our {@link GenerationStatus}.
 * The result arrives via poll-on-read (the generation callback is unused here).
 */
export class KlingVideoGenerator implements IVideoGenerator {
  constructor(private readonly config: KlingConfig) {}

  async submit(request: GenerationRequest): Promise<GenerationHandle> {
    const data = await this.call('POST', '/v1/videos/text2video', {
      model_name: this.config.modelName,
      prompt: request.prompt,
      mode: this.config.mode,
      aspect_ratio: this.config.aspectRatio,
      duration: toKlingDuration(request.durationSeconds),
    });

    const taskId = readString(data, 'task_id');
    if (!taskId) {
      throw new Error('Kling: create response missing data.task_id');
    }
    return { jobRef: taskId };
  }

  async poll(jobRef: string): Promise<GenerationStatus> {
    const data = await this.call('GET', `/v1/videos/text2video/${jobRef}`);
    const status = readString(data, 'task_status');

    switch (status) {
      case 'submitted':
      case 'processing':
        return { state: 'processing' };
      case 'succeed': {
        const url = readVideoUrl(data);
        return url
          ? { state: 'ready', resultUrl: url }
          : { state: 'failed', error: 'Kling: task succeeded without a video url' };
      }
      case 'failed':
        return {
          state: 'failed',
          error: readString(data, 'task_status_msg') ?? 'Generation failed',
        };
      default:
        // Unknown/absent status — treat as still running so we retry on next read.
        return { state: 'processing' };
    }
  }

  private async call(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.signToken()}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(`${this.config.baseUrl}${path}`, init);
    const json = (await res.json().catch(() => ({}))) as KlingEnvelope;

    // Kling signals success with HTTP 2xx AND an envelope `code` of 0.
    if (!res.ok || (typeof json.code === 'number' && json.code !== 0)) {
      throw new Error(`Kling API error (HTTP ${res.status}): ${json.message ?? res.statusText}`);
    }
    return json.data;
  }

  private signToken(): string {
    const nowSec = Math.floor(Date.now() / 1000);
    return jwt.sign(
      { iss: this.config.accessKey, exp: nowSec + TOKEN_TTL_SECONDS, nbf: nowSec - 5 },
      this.config.secretKey,
      { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } },
    );
  }
}

/** Kling only supports 5s or 10s clips; map our 5–60s request to the nearest. */
export function toKlingDuration(durationSeconds: number): '5' | '10' {
  return durationSeconds <= 7 ? '5' : '10';
}

/** Read a string field from an unknown object, or undefined. */
function readString(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Pull `data.task_result.videos[0].url` defensively. */
function readVideoUrl(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const result = (data as Record<string, unknown>).task_result;
  if (typeof result !== 'object' || result === null) return undefined;
  const videos = (result as Record<string, unknown>).videos;
  if (!Array.isArray(videos) || videos.length === 0) return undefined;
  return readString(videos[0], 'url');
}
