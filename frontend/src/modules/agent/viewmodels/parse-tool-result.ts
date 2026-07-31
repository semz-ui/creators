import type { ToolResult } from '../data/agent.types';

export interface ParsedToolResult {
  /** One line to show under the tool chip, or null when there's nothing useful. */
  detail: string | null;
  /** Set when the tool produced or read a video, so the chip can link to it. */
  videoId: string | null;
  /** Set when the tool created a publication. */
  publicationId: string | null;
}

const EMPTY: ParsedToolResult = { detail: null, videoId: null, publicationId: null };

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
    return {
      detail: typeof video.status === 'string' ? `Video ${video.status}` : null,
      videoId: typeof video.id === 'string' ? video.id : null,
      publicationId: null,
    };
  }

  const publication = asRecord(payload.publication);
  if (publication) {
    return {
      detail: typeof publication.status === 'string' ? `Publication ${publication.status}` : null,
      videoId: typeof publication.videoId === 'string' ? publication.videoId : null,
      publicationId: typeof publication.id === 'string' ? publication.id : null,
    };
  }

  if (Array.isArray(payload.connections)) {
    const active = payload.connections.filter((item) => asRecord(item)?.status === 'active').length;
    return { ...EMPTY, detail: `${active} account${active === 1 ? '' : 's'} ready to post to` };
  }

  if (Array.isArray(payload.videos)) {
    const count = payload.videos.length;
    return { ...EMPTY, detail: `${count} video${count === 1 ? '' : 's'}` };
  }

  return EMPTY;
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
