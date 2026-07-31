import { Link } from 'react-router-dom';

import { Badge, type BadgeTone } from '@/shared/ui';

import type { ToolCall, ToolResult } from '../data/agent.types';
import { parseToolResult } from '../viewmodels/parse-tool-result';

/** Plain-language name for each tool the agent can call. */
const TOOL_LABEL: Record<string, string> = {
  list_connections: 'Checked your connected accounts',
  list_videos: 'Looked through your videos',
  get_video: 'Checked on a video',
  generate_video: 'Started generating a video',
  publish_video: 'Publishing',
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

/** One tool invocation, shown inline in the transcript. */
export function ToolCallChip({ call, result }: ToolCallChipProps) {
  const status = !result ? 'running' : result.isError ? 'failed' : 'done';
  const { tone, label } = STATUS[status];
  const parsed = result ? parseToolResult(result) : null;

  return (
    <div className="rounded-lg border border-line-subtle bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-content-secondary">{TOOL_LABEL[call.name] ?? call.name}</span>
        <Badge tone={tone}>{label}</Badge>
      </div>

      {parsed?.detail && <p className="mt-1 text-xs text-content-muted">{parsed.detail}</p>}

      {parsed?.videoId && (
        <Link
          to={`/videos/${parsed.videoId}`}
          className="mt-1 inline-block text-xs text-brand hover:underline"
        >
          View video →
        </Link>
      )}
      {parsed?.publicationId && (
        <Link
          to={`/publications/${parsed.publicationId}`}
          className="mt-1 ml-3 inline-block text-xs text-brand hover:underline"
        >
          View publication →
        </Link>
      )}
    </div>
  );
}
