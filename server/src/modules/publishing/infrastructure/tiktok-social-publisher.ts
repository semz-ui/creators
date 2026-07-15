import type {
  ISocialPublisher,
  PublishRequest,
  PublishResult,
} from '../domain/ports/social-publisher';

const CREATOR_INFO_URL = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
const INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

/** TikTok finishes ingesting these short clips quickly; poll up to ~3min. */
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 36;
const FALLBACK_TITLE = 'Reelo video';
/** TikTok caps video titles at 2200 UTF-16 code units. */
const TITLE_MAX_LENGTH = 2200;

export type TikTokPrivacyLevel =
  | 'SELF_ONLY'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'PUBLIC_TO_EVERYONE';

export interface TikTokPublisherConfig {
  /** Preferred privacy level; used only if the creator_info query allows it. */
  privacyLevel: TikTokPrivacyLevel;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

/** TikTok wraps every Content Posting API response in { data, error }. */
interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
}

interface CreatorInfoData {
  privacy_level_options?: TikTokPrivacyLevel[];
}

interface InitData {
  publish_id?: string;
  upload_url?: string;
}

interface StatusData {
  status?: string;
  fail_reason?: string;
}

/**
 * Publishes videos to TikTok via the Content Posting API's Direct Post flow:
 * query the creator's allowed privacy levels, initialize a FILE_UPLOAD, PUT the
 * downloaded bytes, then poll until publishing completes. The publish_id is the
 * external post id.
 *
 * FILE_UPLOAD (not PULL_FROM_URL) is deliberate: PULL_FROM_URL requires TikTok
 * domain-ownership verification, which the Cloudinary host can't satisfy.
 *
 * Note: until the API client passes TikTok's audit, posts are forced to
 * SELF_ONLY (private) regardless of the configured level — creator_info reports
 * the allowed set, and this publisher honors it.
 */
export class TikTokSocialPublisher implements ISocialPublisher {
  private readonly privacyLevel: TikTokPrivacyLevel;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(config: TikTokPublisherConfig) {
    this.privacyLevel = config.privacyLevel;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const privacyLevel = await this.resolvePrivacyLevel(request.accessToken);
    const video = await this.downloadVideo(request.videoUrl);
    const { publishId, uploadUrl } = await this.initUpload(request, privacyLevel, video.length);
    await this.uploadVideo(uploadUrl, video);
    await this.waitForPublish(publishId, request.accessToken);
    return { externalPostId: publishId };
  }

  /** Query the creator's allowed privacy levels and pick the configured one if permitted. */
  private async resolvePrivacyLevel(accessToken: string): Promise<TikTokPrivacyLevel> {
    const data = await this.post<CreatorInfoData>(
      CREATOR_INFO_URL,
      accessToken,
      {},
      'creator info',
    );
    const allowed = data.privacy_level_options ?? [];
    if (allowed.length === 0) {
      throw new Error('TikTok creator info returned no available privacy levels');
    }
    // The configured level requires audit approval; fall back to what's allowed
    // (pre-audit that is SELF_ONLY) rather than sending a level TikTok rejects.
    return allowed.includes(this.privacyLevel)
      ? this.privacyLevel
      : (allowed[0] as TikTokPrivacyLevel);
  }

  private async downloadVideo(videoUrl: string): Promise<Uint8Array> {
    const res = await fetch(videoUrl);
    if (!res.ok) {
      throw new Error(`Video download failed (HTTP ${res.status}): ${res.statusText}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  private async initUpload(
    request: PublishRequest,
    privacyLevel: TikTokPrivacyLevel,
    videoSize: number,
  ): Promise<{ publishId: string; uploadUrl: string }> {
    const data = await this.post<InitData>(
      INIT_URL,
      request.accessToken,
      {
        post_info: {
          title: deriveTitle(request.caption),
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          // Clips are a few MB — upload as a single chunk.
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      },
      'upload init',
    );
    if (!data.publish_id || !data.upload_url) {
      throw new Error('TikTok upload init did not return a publish_id and upload_url');
    }
    return { publishId: data.publish_id, uploadUrl: data.upload_url };
  }

  private async uploadVideo(uploadUrl: string, video: Uint8Array): Promise<void> {
    const size = video.length;
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(size),
        'Content-Range': `bytes 0-${size - 1}/${size}`,
      },
      body: video,
    });
    if (!res.ok) {
      throw new Error(`TikTok video upload failed (HTTP ${res.status}): ${res.statusText}`);
    }
  }

  private async waitForPublish(publishId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const data = await this.post<StatusData>(
        STATUS_URL,
        accessToken,
        { publish_id: publishId },
        'status check',
      );
      if (data.status === 'PUBLISH_COMPLETE') {
        return;
      }
      if (data.status === 'FAILED') {
        throw new Error(`TikTok publishing failed: ${data.fail_reason ?? 'unknown reason'}`);
      }
      await sleep(this.pollIntervalMs);
    }
    throw new Error(`TikTok video was not published after ${this.maxPollAttempts} status checks`);
  }

  /** POST JSON to a Content Posting API endpoint and unwrap the { data, error } envelope. */
  private async post<T>(url: string, accessToken: string, body: unknown, step: string): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<T>;
    // TikTok signals logical failures via error.code even on HTTP 200.
    if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
      throw new Error(
        `TikTok ${step} failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    return (json.data ?? {}) as T;
  }
}

/** Caption flattened to one line and capped to TikTok's title limit. */
export function deriveTitle(caption: string | null): string {
  const flat = (caption ?? '').replace(/\s+/g, ' ').trim();
  if (flat === '') {
    return FALLBACK_TITLE;
  }
  return flat.length > TITLE_MAX_LENGTH ? flat.slice(0, TITLE_MAX_LENGTH) : flat;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
