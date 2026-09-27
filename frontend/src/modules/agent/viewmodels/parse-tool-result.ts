import type { VideoStatus } from '@/modules/video/data/video.types';

import type { ToolResult } from '../data/agent.types';

/**
 * A video a tool returned, in the minimal shape the transcript renders.
 * Deliberately narrower than the video module's `Video` — a tool result only
 * carries these fields.
 */
export interface ChatVideo {
  id: string;
  status: VideoStatus;
  prompt: string | null;
  durationSeconds: number | null;
  resultUrl: string | null;
  error: string | null;
}

export interface ParsedToolResult {
  /** One line to show under the tool chip, or null when there's nothing useful. */
  detail: string | null;
  /** Set when the tool produced or read a video, so the chip can link to it. */
  videoId: string | null;
  /** Set when the tool created a publication. */
  publicationId: string | null;
  /** Videos the result carried, ready to play inline. Empty for other tools. */
  videos: ChatVideo[];
}

const EMPTY: ParsedToolResult = { detail: null, videoId: null, publicationId: null, videos: [] };

const VIDEO_STATUSES: readonly string[] = ['queued', 'processing', 'ready', 'failed'];

/**
 * Tool results arrive as serialized JSON (or, on failure, a plain sentence).
 * This is the only place that parses them — components stay declarative.
 */
export function parseToolResult(result: ToolResult): ParsedToolResult {
  // Failures are already a human-readable message from the server.
  if (result.isError) return { ...EMPTY, detail: result.content };

  const payload = safeParse(result.content);
  if (!isRecord(payload)) return EMPTY;

  const video = asRecord(payload.video);
  if (video) {
    const parsed = toChatVideo(video);
    return {
      detail: typeof video.status === 'string' ? `Video ${video.status}` : null,
      videoId: typeof video.id === 'string' ? video.id : null,
      publicationId: null,
      videos: parsed ? [parsed] : [],
    };
  }

  const publication = asRecord(payload.publication);
  if (publication) {
    return {
      detail: typeof publication.status === 'string' ? `Publication ${publication.status}` : null,
      videoId: typeof publication.videoId === 'string' ? publication.videoId : null,
      publicationId: typeof publication.id === 'string' ? publication.id : null,
      videos: [],
    };
  }

  if (Array.isArray(payload.connections)) {
    const active = payload.connections.filter((item) => asRecord(item)?.status === 'active').length;
    return { ...EMPTY, detail: `${active} account${active === 1 ? '' : 's'} ready to post to` };
  }

  if (Array.isArray(payload.videos)) {
    const count = payload.videos.length;
    return {
      detail: `${count} video${count === 1 ? '' : 's'}`,
      videoId: null,
      publicationId: null,
      videos: payload.videos.map(toChatVideoOrNull).filter(isPresent),
    };
  }

  return EMPTY;
}

/** A video is only renderable if we can identify it and trust its status. */
function toChatVideo(raw: Record<string, unknown>): ChatVideo | null {
  if (typeof raw.id !== 'string' || !isVideoStatus(raw.status)) return null;
  return {
    id: raw.id,
    status: raw.status,
    prompt: typeof raw.prompt === 'string' ? raw.prompt : null,
    durationSeconds: typeof raw.durationSeconds === 'number' ? raw.durationSeconds : null,
    resultUrl: typeof raw.resultUrl === 'string' ? raw.resultUrl : null,
    error: typeof raw.error === 'string' ? raw.error : null,
  };
}

function toChatVideoOrNull(value: unknown): ChatVideo | null {
  const record = asRecord(value);
  return record ? toChatVideo(record) : null;
}

function isVideoStatus(value: unknown): value is VideoStatus {
  return typeof value === 'string' && VIDEO_STATUSES.includes(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
