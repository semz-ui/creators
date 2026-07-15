import { env } from '@shared/infrastructure/config/env';
import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type {
  ISocialPublisher,
  PublishRequest,
  PublishResult,
} from '../domain/ports/social-publisher';

const UPLOAD_INIT_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
/** YouTube's hard limit on video titles. */
const TITLE_MAX_LENGTH = 100;
const FALLBACK_TITLE = 'Reelo video';
/** "People & Blogs" — a neutral default category. */
const CATEGORY_ID = '22';

export type YouTubePrivacyStatus = 'private' | 'unlisted' | 'public';

export interface YouTubePublisherConfig {
  privacyStatus: YouTubePrivacyStatus;
}

interface YouTubeApiError {
  error?: { message?: string };
}

interface YouTubeVideoResponse extends YouTubeApiError {
  id?: string;
}

/**
 * Publishes videos to YouTube via the Data API's resumable upload: download
 * the generated clip, initiate an upload session, PUT the bytes. The video's
 * id is the external post id.
 */
export class YouTubeSocialPublisher implements ISocialPublisher {
  constructor(private readonly config: YouTubePublisherConfig) {}

  async publish(request: PublishRequest): Promise<PublishResult> {
    // Clips are short AI videos (a few MB) — buffering is fine. Streaming the
    // download straight into the upload is a future optimization.
    const video = await this.downloadVideo(request.videoUrl);
    const uploadUrl = await this.initiateUpload(request.accessToken, request.caption);
    const id = await this.uploadVideo(uploadUrl, request.accessToken, video);
    return { externalPostId: id };
  }

  private async downloadVideo(videoUrl: string): Promise<Uint8Array> {
    const res = await fetchWithTimeout(videoUrl, {}, { timeoutMs: env.HTTP_MEDIA_TIMEOUT_MS });
    if (!res.ok) {
      throw new Error(`Video download failed (HTTP ${res.status}): ${res.statusText}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  private async initiateUpload(accessToken: string, caption: string | null): Promise<string> {
    const res = await fetchWithTimeout(UPLOAD_INIT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          title: deriveTitle(caption),
          description: caption ?? '',
          categoryId: CATEGORY_ID,
        },
        status: { privacyStatus: this.config.privacyStatus, selfDeclaredMadeForKids: false },
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `YouTube upload failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    const location = res.headers.get('location');
    if (!location) {
      throw new Error('YouTube upload failed: no resumable upload URL returned');
    }
    return location;
  }

  private async uploadVideo(
    uploadUrl: string,
    accessToken: string,
    video: Uint8Array,
  ): Promise<string> {
    const res = await fetchWithTimeout(
      uploadUrl,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'video/*' },
        body: video,
      },
      { timeoutMs: env.HTTP_MEDIA_TIMEOUT_MS },
    );
    const json = (await res.json().catch(() => ({}))) as YouTubeVideoResponse;
    if (!res.ok || !json.id) {
      throw new Error(
        `YouTube upload failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    return json.id;
  }
}

/** Caption flattened to one line and capped to YouTube's title limit. */
export function deriveTitle(caption: string | null): string {
  // YouTube rejects < and > in titles.
  const flat = (caption ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (flat === '') {
    return FALLBACK_TITLE;
  }
  return flat.length > TITLE_MAX_LENGTH ? flat.slice(0, TITLE_MAX_LENGTH) : flat;
}
