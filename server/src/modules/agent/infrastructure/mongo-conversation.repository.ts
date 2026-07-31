import { Conversation } from '../domain/conversation.entity';
import type {
  ConversationPage,
  IConversationRepository,
} from '../domain/ports/conversation-repository';
import { ConversationModel, type ConversationDocument } from './conversation.model';

/** MongoDB implementation of {@link IConversationRepository}. */
export class MongoConversationRepository implements IConversationRepository {
  async save(conversation: Conversation): Promise<void> {
    const s = conversation.toSnapshot();
    await ConversationModel.updateOne(
      { _id: s.id },
      {
        $set: {
          ownerId: s.ownerId,
          title: s.title,
          messages: s.messages,
          pendingAction: s.pendingAction,
          updatedAt: s.updatedAt,
        },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true },
    ).exec();
  }

  async findById(id: string): Promise<Conversation | null> {
    const doc = await ConversationModel.findById(id).lean<ConversationDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByOwner(
    ownerId: string,
    options: { limit: number; skip: number },
  ): Promise<ConversationPage> {
    const [docs, total] = await Promise.all([
      ConversationModel.find({ ownerId })
        .sort({ updatedAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean<ConversationDocument[]>()
        .exec(),
      ConversationModel.countDocuments({ ownerId }).exec(),
    ]);

    return { items: docs.map((doc) => this.toEntity(doc)), total };
  }

  private toEntity(doc: ConversationDocument): Conversation {
    return Conversation.fromSnapshot({
      id: doc._id,
      ownerId: doc.ownerId,
      title: doc.title,
      messages: doc.messages ?? [],
      pendingAction: doc.pendingAction ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
