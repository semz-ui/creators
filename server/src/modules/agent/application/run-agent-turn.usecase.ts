import { ConversationNotFoundError } from '../domain/agent.errors';
import { Conversation } from '../domain/conversation.entity';
import type { IConversationRepository } from '../domain/ports/conversation-repository';
import type { AgentLoop } from './agent-loop.service';
import type { PublicConversation } from './dto';
import { toPublicConversation } from './dto';

export interface RunAgentTurnInput {
  /** Omit to start a new conversation. */
  conversationId?: string;
  message: string;
}

/**
 * Runs one user turn: appends the message, lets the agent work until it either
 * answers or needs the user to confirm an action, then persists.
 */
export class RunAgentTurn {
  constructor(
    private readonly conversations: IConversationRepository,
    private readonly loop: AgentLoop,
  ) {}

  async execute(userId: string, input: RunAgentTurnInput): Promise<PublicConversation> {
    const conversation = input.conversationId
      ? await this.load(userId, input.conversationId)
      : Conversation.create({ ownerId: userId });

    conversation.requireIdle();
    conversation.appendUser(input.message);

    await this.loop.run(conversation, { userId, conversationId: conversation.id });
    await this.conversations.save(conversation);

    return toPublicConversation(conversation);
  }

  private async load(userId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversations.findById(id);
    // Another owner's conversation is indistinguishable from a missing one.
    if (!conversation || conversation.ownerId !== userId) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }
}
