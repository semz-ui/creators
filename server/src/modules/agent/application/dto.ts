import type { AgentMessage } from '../domain/agent-message';
import { messageText, toolCalls } from '../domain/agent-message';
import type { Conversation } from '../domain/conversation.entity';

export interface PublicToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface PublicToolResult {
  toolUseId: string;
  content: string;
  isError: boolean;
}

export interface PublicAgentMessage {
  role: 'user' | 'assistant';
  text: string;
  toolCalls: PublicToolCall[];
  toolResults: PublicToolResult[];
}

export interface PublicPendingAction {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface PublicConversation {
  id: string;
  title: string;
  messages: PublicAgentMessage[];
  pendingAction: PublicPendingAction | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartConversationInput {
  message: string;
}

export interface SendMessageInput {
  conversationId: string;
  message: string;
}

export type ActionDecision = 'approve' | 'reject';

export interface ResolveActionInput {
  conversationId: string;
  toolUseId: string;
  decision: ActionDecision;
}

export interface ListConversationsInput {
  page: number;
  limit: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Maps a stored message to the wire shape. Reasoning blocks (`thinking` /
 * `redacted_thinking`) are stored so they can be replayed to the model, but
 * are deliberately dropped here — they never leave the server.
 */
function toPublicMessage(message: AgentMessage): PublicAgentMessage {
  return {
    role: message.role,
    text: messageText(message),
    toolCalls: toolCalls(message).map((call) => ({
      id: call.id,
      name: call.name,
      input: call.input,
    })),
    toolResults: message.content
      .filter(
        (block): block is Extract<typeof block, { type: 'tool_result' }> =>
          block.type === 'tool_result',
      )
      .map((block) => ({
        toolUseId: block.toolUseId,
        content: block.content,
        isError: block.isError,
      })),
  };
}

export function toPublicConversation(conversation: Conversation): PublicConversation {
  const pending = conversation.pendingAction;
  return {
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages.map(toPublicMessage),
    pendingAction: pending
      ? {
          toolUseId: pending.toolUseId,
          toolName: pending.toolName,
          input: pending.input,
          summary: pending.summary,
        }
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}
