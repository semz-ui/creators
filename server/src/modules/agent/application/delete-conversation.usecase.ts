import { ConversationNotFoundError } from '../domain/agent.errors';
import type { IConversationRepository } from '../domain/ports/conversation-repository';

/**
 * Removes a conversation from the user's history.
 *
 * The write goes through the same guarded `save` as a turn, so a delete racing
 * a turn is rejected as a conflict rather than silently discarding whichever
 * one lost. Deleting twice is a 404 — the repository stops handing back
 * conversations that are already gone.
 */
export class DeleteConversation {
  constructor(private readonly conversations: IConversationRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const conversation = await this.conversations.findById(id);
    // Another owner's conversation is indistinguishable from a missing one.
    if (!conversation || conversation.ownerId !== userId) {
      throw new ConversationNotFoundError(id);
    }

    conversation.softDelete();
    await this.conversations.save(conversation);
  }
}
