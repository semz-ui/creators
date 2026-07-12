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

  async findByGoogleId(googleId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ googleId }).lean<UserDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const found = await UserModel.exists({ email: email.value });
    return found !== null;
  }

  async save(user: User): Promise<void> {
    const s = user.toSnapshot();
    // Null optional fields are $unset rather than stored as null: the sparse
    // unique googleId index still indexes explicit nulls, which would make two
    // Google-less users collide.
    const set: Record<string, unknown> = { email: s.email, updatedAt: s.updatedAt };
    const unset: Record<string, ''> = {};
    if (s.passwordHash !== null) set.passwordHash = s.passwordHash;
    else unset.passwordHash = '';
    if (s.googleId !== null) set.googleId = s.googleId;
    else unset.googleId = '';

    await UserModel.updateOne(
      { _id: s.id },
      {
        $set: set,
        $setOnInsert: { createdAt: s.createdAt },
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
      { upsert: true },
    ).exec();
  }

  private toEntity(doc: UserDocument): User {
    return User.fromSnapshot({
      id: doc._id,
      email: doc.email,
      passwordHash: doc.passwordHash ?? null,
      googleId: doc.googleId ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
