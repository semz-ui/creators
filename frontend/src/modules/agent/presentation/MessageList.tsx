import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import type { AgentMessage, ToolResult } from '../data/agent.types';
import { MessageBubble } from './MessageBubble';
import { ToolCallChip } from './ToolCallChip';

interface MessageListProps {
  messages: AgentMessage[];
  /** True while the last user message is still awaiting a reply. */
  isSending?: boolean | undefined;
}

interface Row {
  message: AgentMessage;
  /** Index in the original transcript — identifies the optimistic message. */
  index: number;
  showBubble: boolean;
}

/**
 * Renders the transcript.
 *
 * A `user` message carrying tool results is not something the person typed —
 * it is how the API models a tool's reply. Those are folded into the chip for
 * the call that produced them, never shown as a user bubble.
 */
export function MessageList({ messages, isSending }: MessageListProps) {
  const resultsByToolUseId = useMemo(() => {
    const map = new Map<string, ToolResult>();
    for (const message of messages) {
      for (const result of message.toolResults) {
        map.set(result.toolUseId, result);
      }
    }
    return map;
  }, [messages]);

  // Everything with nothing to show is dropped up front, so a run of assistant
  // turns can be detected by looking at the previous *rendered* row.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    messages.forEach((message, index) => {
      const isToolReply = message.toolResults.length > 0;
      const showBubble = !isToolReply && message.text.length > 0;
      if (!showBubble && message.toolCalls.length === 0) return;
      out.push({ message, index, showBubble });
    });
    return out;
  }, [messages]);

  const lastIndex = messages.length - 1;

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, rowIndex) => {
        const { message } = row;
        const isUser = message.role === 'user';
        const isOptimistic = Boolean(isSending) && row.index === lastIndex;

        if (isUser) {
          return (
            <div key={row.index} className="flex justify-end pl-10">
              <MessageBubble role="user" text={message.text} pending={isOptimistic} />
            </div>
          );
        }

        // One avatar per run of assistant turns, not one per message.
        const startsRun = rows[rowIndex - 1]?.message.role !== 'assistant';

        return (
          <div key={row.index} className="flex gap-3">
            <div className="w-7 shrink-0">{startsRun && <AssistantAvatar />}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {row.showBubble && <MessageBubble role="assistant" text={message.text} />}
              {message.toolCalls.map((call) => (
                <ToolCallChip key={call.id} call={call} result={resultsByToolUseId.get(call.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      aria-hidden
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-glow-sm"
    >
      <Sparkles className="h-3.5 w-3.5 text-white" />
    </div>
  );
}
