import { Eye, Film, Link2, Send, Sparkles, Wrench, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, type BadgeTone } from '@/shared/ui';

import type { ToolCall, ToolResult } from '../data/agent.types';
import { parseToolResult } from '../viewmodels/parse-tool-result';
import { ChatVideoCard } from './ChatVideoCard';
import { ChatVideoStrip } from './ChatVideoStrip';

/** Plain-language name and icon for each tool the agent can call. */
const TOOL: Record<string, { label: string; icon: LucideIcon }> = {
  list_connections: { label: 'Checked your connected accounts', icon: Link2 },
  list_videos: { label: 'Looked through your videos', icon: Film },
  get_video: { label: 'Checked on a video', icon: Eye },
  generate_video: { label: 'Started generating a video', icon: Sparkles },
  publish_video: { label: 'Publishing', icon: Send },
};

const STATUS: Record<'running' | 'done' | 'failed', { tone: BadgeTone; label: string }> = {
  running: { tone: 'neutral', label: 'Working' },
  done: { tone: 'success', label: 'Done' },
  failed: { tone: 'danger', label: 'Failed' },
};

interface ToolCallChipProps {
  call: ToolCall;
  /** Absent while the call is still in flight or awaiting the user's approval. */
  result?: ToolResult | undefined;
}

/**
 * One tool invocation, shown inline in the transcript.
 *
 * The call itself stays a quiet single line — it is a note about what the
 * assistant did, not the point of the message. Anything it produced that is
 * worth looking at (a video) is rendered below it at full size.
 */
export function ToolCallChip({ call, result }: ToolCallChipProps) {
  const status = !result ? 'running' : result.isError ? 'failed' : 'done';
  const { tone, label } = STATUS[status];
  const { label: toolLabel, icon: Icon } = TOOL[call.name] ?? { label: call.name, icon: Wrench };
  const parsed = result ? parseToolResult(result) : null;

  const videos = parsed?.videos ?? [];
  const [onlyVideo] = videos;
  // The cards carry their own link, so the text one would just be noise.
  const showVideoLink = Boolean(parsed?.videoId) && videos.length === 0;

  return (
    <div className="flex flex-col gap-2 py-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon
          className={
            status === 'running'
              ? 'h-3.5 w-3.5 shrink-0 animate-pulse text-brand-accent'
              : 'h-3.5 w-3.5 shrink-0 text-content-muted'
          }
        />
        <span className="text-sm text-content-secondary">{toolLabel}</span>
        <Badge tone={tone}>{label}</Badge>
      </div>

      {parsed?.detail && <p className="text-xs text-content-muted">{parsed.detail}</p>}

      {videos.length === 1 && onlyVideo && <ChatVideoCard video={onlyVideo} />}
      {videos.length > 1 && <ChatVideoStrip videos={videos} />}

      {(showVideoLink || parsed?.publicationId) && (
        <div className="flex flex-wrap gap-3">
          {showVideoLink && parsed?.videoId && (
            <Link to={`/videos/${parsed.videoId}`} className="text-xs text-brand hover:underline">
              View video →
            </Link>
          )}
          {parsed?.publicationId && (
            <Link
              to={`/publications/${parsed.publicationId}`}
              className="text-xs text-brand hover:underline"
            >
              View publication →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
