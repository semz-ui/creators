export type AgentRole = 'user' | 'assistant';

/**
 * Provider-neutral content block. Infrastructure maps these to and from the
 * concrete model SDK's shapes, so the domain and the loop never import one.
 *
 * `thinking` / `redacted_thinking` blocks are stored purely so they can be
 * replayed to the model verbatim on the next turn — the API rejects edited or
 * reordered reasoning blocks. They are never exposed to clients.
 */
export type AgentContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'redacted_thinking'; data: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; content: string; isError: boolean };

export interface AgentMessage {
  role: AgentRole;
  content: AgentContentBlock[];
}

/** Why the model stopped generating. Only `tool_use` continues the loop. */
export type AgentStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'refusal';

export function textBlock(text: string): AgentContentBlock {
  return { type: 'text', text };
}

export function toolResultBlock(
  toolUseId: string,
  content: string,
  isError = false,
): AgentContentBlock {
  return { type: 'tool_result', toolUseId, content, isError };
}

/** Concatenated text of a message, ignoring reasoning and tool blocks. */
export function messageText(message: AgentMessage): string {
  return message.content
    .filter((block): block is Extract<AgentContentBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Tool calls the model made in a message, in order. */
export function toolCalls(
  message: AgentMessage,
): Extract<AgentContentBlock, { type: 'tool_use' }>[] {
  return message.content.filter(
    (block): block is Extract<AgentContentBlock, { type: 'tool_use' }> => block.type === 'tool_use',
  );
}
