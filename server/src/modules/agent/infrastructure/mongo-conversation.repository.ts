import { MongoServerError } from 'mongodb';

import { ConversationConflictError } from '../domain/agent.errors';
import { Conversation } from '../domain/conversation.entity';
import type {
  ConversationPage,
  IConversationRepository,
} from '../domain/ports/conversation-repository';
import { ConversationModel, type ConversationDocument } from './conversation.model';

/** MongoDB implementation of {@link IConversationRepository}. */
export class MongoConversationRepository implements IConversationRepository {
  /**
   * Writes the conversation, guarded on the revision it was loaded at.
   *
   * The whole message array is replaced on every save, so without the guard a
   * slower concurrent turn would overwrite a faster one wholesale — losing its
   * messages while its side effects (a charged generation, a publication)
   * survive. A stale write is rejected instead.
   */
  async save(conversation: Conversation): Promise<void> {
    const s = conversation.toSnapshot();

    try {
      const result = await ConversationModel.updateOne(
        { _id: s.id, version: s.version },
        {
          $set: {
            ownerId: s.ownerId,
            title: s.title,
            messages: s.messages,
            pendingAction: s.pendingAction,
            version: s.version + 1,
            updatedAt: s.updatedAt,
          },
          $setOnInsert: { createdAt: s.createdAt },
        },
        { upsert: true },
      ).exec();

      // No match and no insert means the document moved on without us.
      if (result.matchedCount === 0 && result.upsertedCount === 0) {
        throw new ConversationConflictError();
      }
    } catch (error) {
      // The upsert raced another insert of the same id, or the filter missed a
      // row that does exist — both are the same conflict from the caller's side.
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConversationConflictError();
      }
      throw error;
    }

    conversation.markPersisted();
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
      version: doc.version ?? 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
