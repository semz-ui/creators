import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import type {
  ISocialPublisher,
  PublishRequest,
  PublishResult,
} from '../domain/ports/social-publisher';

const GRAPH_BASE = 'https://graph.instagram.com';
/** Reels containers typically finish in 30s–2min; Meta suggests polling ≤5min. */
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 36;

export interface InstagramPublisherConfig {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

interface InstagramApiError {
  error?: { message?: string };
}

interface IdResponse extends InstagramApiError {
  id?: string;
}

interface MeResponse extends InstagramApiError {
  user_id?: number | string;
}

interface StatusResponse extends InstagramApiError {
  status_code?: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';
}

/**
 * Publishes videos as Instagram Reels via the Instagram platform API:
 * create a media container pointing at the public video URL, poll until
 * Instagram finishes ingesting it, then publish. The media id is the external
 * post id. Note: Meta caps accounts at 100 API-published posts per 24h.
 */
export class InstagramSocialPublisher implements ISocialPublisher {
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(config: InstagramPublisherConfig = {}) {
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    // The publish request carries no account id — resolve it from the token.
    const igUserId = await this.resolveUserId(request.accessToken);
    const containerId = await this.createContainer(igUserId, request);
    await this.waitForContainer(containerId, request.accessToken);
    const mediaId = await this.publishContainer(igUserId, containerId, request.accessToken);
    return { externalPostId: mediaId };
  }

  private async resolveUserId(accessToken: string): Promise<string> {
    const res = await fetchWithTimeout(`${GRAPH_BASE}/me?fields=user_id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as MeResponse;
    if (!res.ok || json.user_id == null) {
      throw new Error(
        `Instagram user lookup failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    return String(json.user_id);
  }

  private async createContainer(igUserId: string, request: PublishRequest): Promise<string> {
    const res = await fetchWithTimeout(`${GRAPH_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: request.videoUrl,
        ...(request.caption !== null && { caption: request.caption }),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as IdResponse;
    if (!res.ok || !json.id) {
      throw new Error(
        `Instagram media container creation failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    return json.id;
  }

  private async waitForContainer(containerId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const res = await fetchWithTimeout(`${GRAPH_BASE}/${containerId}?fields=status_code`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json().catch(() => ({}))) as StatusResponse;
      if (!res.ok) {
        throw new Error(
          `Instagram container status check failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
        );
      }
      if (json.status_code === 'FINISHED' || json.status_code === 'PUBLISHED') {
        return;
      }
      if (json.status_code === 'ERROR' || json.status_code === 'EXPIRED') {
        throw new Error(`Instagram media container failed with status ${json.status_code}`);
      }
      await sleep(this.pollIntervalMs);
    }
    throw new Error(
      `Instagram media container was not ready after ${this.maxPollAttempts} status checks`,
    );
  }

  private async publishContainer(
    igUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<string> {
    const res = await fetchWithTimeout(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId }),
    });
    const json = (await res.json().catch(() => ({}))) as IdResponse;
    if (!res.ok || !json.id) {
      throw new Error(
        `Instagram publish failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }
    return json.id;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
