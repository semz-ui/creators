import type { PagedResult, PublicAgentMessage, PublicConversation } from '../application/dto';

import type {
  AgentMessageResponse,
  ConversationPageResponse,
  ConversationResponse,
} from './agent.dto';

/**
 * Maps the agent application DTOs to the presentation DTOs sent on the wire.
 * Every field is enumerated here, so the presentation layer owns its contract —
 * in particular, the model's reasoning blocks never reach a client.
 */

function presentMessage(message: PublicAgentMessage): AgentMessageResponse {
  return {
    role: message.role,
    text: message.text,
    toolCalls: message.toolCalls.map((call) => ({
      id: call.id,
      name: call.name,
      input: call.input,
    })),
    toolResults: message.toolResults.map((result) => ({
      toolUseId: result.toolUseId,
      content: result.content,
      isError: result.isError,
    })),
  };
}

export function presentConversation(conversation: PublicConversation): ConversationResponse {
  return {
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages.map(presentMessage),
    pendingAction: conversation.pendingAction
      ? {
          toolUseId: conversation.pendingAction.toolUseId,
          toolName: conversation.pendingAction.toolName,
          input: conversation.pendingAction.input,
          summary: conversation.pendingAction.summary,
        }
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function presentConversationPage(
  page: PagedResult<PublicConversation>,
): ConversationPageResponse {
  return {
    items: page.items.map(presentConversation),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}
