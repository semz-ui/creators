import { Schema, model } from 'mongoose';

/** Mongoose document shape for a persisted user. `_id` is the domain UUID. */
export interface UserDocument {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export const UserModel = model<UserDocument>('User', userSchema);
