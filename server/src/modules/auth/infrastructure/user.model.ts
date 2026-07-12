import { Schema, model } from 'mongoose';

/** Mongoose document shape for a persisted user. `_id` is the domain UUID. */
export interface UserDocument {
  _id: string;
  email: string;
  /** Absent for Google-only accounts that never set a password. */
  passwordHash?: string;
  /** Google `sub` claim; absent unless the account is linked to Google. */
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    // Sparse: documents without the field stay out of the index, so
    // password-only users can't collide on a missing googleId.
    googleId: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const UserModel = model<UserDocument>('User', userSchema);
