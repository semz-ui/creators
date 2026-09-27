import { ConversationNotFoundError } from '../domain/agent.errors';
import type { IConversationRepository } from '../domain/ports/conversation-repository';
import type { PublicConversation } from './dto';
import { toPublicConversation } from './dto';

export class GetConversation {
  constructor(private readonly conversations: IConversationRepository) {}

  async execute(userId: string, id: string): Promise<PublicConversation> {
    const conversation = await this.conversations.findById(id);
    if (!conversation || conversation.ownerId !== userId) {
      throw new ConversationNotFoundError(id);
    }
    return toPublicConversation(conversation);
  }
}
