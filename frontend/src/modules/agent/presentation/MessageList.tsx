import { useMemo } from 'react';

import type { AgentMessage, ToolResult } from '../data/agent.types';
import { MessageBubble } from './MessageBubble';
import { ToolCallChip } from './ToolCallChip';

interface MessageListProps {
  messages: AgentMessage[];
  /** True while the last user message is still awaiting a reply. */
  isSending?: boolean | undefined;
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

  const lastIndex = messages.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message, index) => {
        const isToolReply = message.toolResults.length > 0;
        const showBubble = !isToolReply && message.text.length > 0;
        const isOptimistic = Boolean(isSending) && index === lastIndex;

        if (!showBubble && message.toolCalls.length === 0) return null;

        return (
          <div key={index} className="flex flex-col gap-2">
            {showBubble && (
              <MessageBubble role={message.role} text={message.text} pending={isOptimistic} />
            )}
            {message.toolCalls.map((call) => (
              <ToolCallChip key={call.id} call={call} result={resultsByToolUseId.get(call.id)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
