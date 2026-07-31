import type { IConversationRepository } from '../domain/ports/conversation-repository';
import type { ListConversationsInput, PagedResult, PublicConversation } from './dto';
import { toPublicConversation } from './dto';

export class ListConversations {
  constructor(private readonly conversations: IConversationRepository) {}

  async execute(
    userId: string,
    input: ListConversationsInput,
  ): Promise<PagedResult<PublicConversation>> {
    const { page, limit } = input;
    const { items, total } = await this.conversations.findByOwner(userId, {
      limit,
      skip: (page - 1) * limit,
    });

    return { items: items.map(toPublicConversation), page, limit, total };
  }
}
