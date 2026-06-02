import type { IUserRepository } from '../domain/ports/user-repository';
import { User } from '../domain/user.entity';
import type { Email } from '../domain/value-objects/email';
import { UserModel, type UserDocument } from './user.model';

/** MongoDB implementation of {@link IUserRepository}, backed by Mongoose. */
export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).lean<UserDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.value }).lean<UserDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const found = await UserModel.exists({ email: email.value });
    return found !== null;
  }

  async save(user: User): Promise<void> {
    const s = user.toSnapshot();
    await UserModel.updateOne(
      { _id: s.id },
      {
        $set: { email: s.email, passwordHash: s.passwordHash, updatedAt: s.updatedAt },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true },
    ).exec();
  }

  private toEntity(doc: UserDocument): User {
    return User.fromSnapshot({
      id: doc._id,
      email: doc.email,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
