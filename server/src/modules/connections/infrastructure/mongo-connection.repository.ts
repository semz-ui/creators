import { Connection } from '../domain/connection.entity';
import type { IConnectionRepository } from '../domain/ports/connection-repository';
import type { ITokenCipher } from '../domain/ports/token-cipher';
import type { Platform } from '../domain/platform';
import { ConnectionModel, type ConnectionDocument } from './connection.model';

/**
 * MongoDB implementation of {@link IConnectionRepository}. Encrypts OAuth tokens
 * with the injected cipher on the way in and decrypts on the way out, so the
 * domain works with plaintext while the database only ever holds ciphertext.
 */
export class MongoConnectionRepository implements IConnectionRepository {
  constructor(private readonly cipher: ITokenCipher) {}

  async save(connection: Connection): Promise<void> {
    const s = connection.toSnapshot();
    await ConnectionModel.updateOne(
      { _id: s.id },
      {
        $set: {
          userId: s.userId,
          platform: s.platform,
          externalAccountId: s.externalAccountId,
          displayName: s.displayName,
          scopes: s.scopes,
          status: s.status,
          accessToken: this.cipher.encrypt(s.accessToken),
          refreshToken: s.refreshToken === null ? null : this.cipher.encrypt(s.refreshToken),
          expiresAt: s.expiresAt,
          updatedAt: s.updatedAt,
        },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true },
    ).exec();
  }

  async findById(id: string): Promise<Connection | null> {
    const doc = await ConnectionModel.findById(id).lean<ConnectionDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserAndPlatform(userId: string, platform: Platform): Promise<Connection | null> {
    const doc = await ConnectionModel.findOne({ userId, platform })
      .lean<ConnectionDocument>()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async listByUser(userId: string): Promise<Connection[]> {
    const docs = await ConnectionModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean<ConnectionDocument[]>()
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async delete(id: string): Promise<void> {
    await ConnectionModel.deleteOne({ _id: id }).exec();
  }

  private toEntity(doc: ConnectionDocument): Connection {
    return Connection.fromSnapshot({
      id: doc._id,
      userId: doc.userId,
      platform: doc.platform,
      externalAccountId: doc.externalAccountId,
      displayName: doc.displayName,
      scopes: doc.scopes ?? [],
      status: doc.status,
      accessToken: this.cipher.decrypt(doc.accessToken),
      refreshToken: doc.refreshToken === null ? null : this.cipher.decrypt(doc.refreshToken),
      expiresAt: doc.expiresAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
