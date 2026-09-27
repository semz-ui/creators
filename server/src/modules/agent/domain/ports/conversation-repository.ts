import type { Conversation } from '../conversation.entity';

export interface ConversationPage {
  items: Conversation[];
  total: number;
}

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findByOwner(ownerId: string, options: { limit: number; skip: number }): Promise<ConversationPage>;
}
