import { Schema, model } from 'mongoose';

import type { AgentMessage } from '../domain/agent-message';
import type { PendingAction } from '../domain/conversation.entity';

export interface ConversationDocument {
  _id: string;
  ownerId: string;
  title: string;
  messages: AgentMessage[];
  pendingAction: PendingAction | null;
  /** Soft-delete flag; see `ConversationSnapshot.isDeleted`. */
  isDeleted: boolean;
  /** Optimistic-concurrency revision; see `ConversationSnapshot.version`. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Content blocks are a discriminated union whose members carry different
 * fields, so the array is stored loosely-typed and reconstructed by the
 * domain. `_id: false` keeps Mongoose from injecting ids into every block.
 */
// Left untyped: the block union's members carry different fields, which is
// exactly what Mongoose's typed schema definitions cannot express.
const messageSchema = new Schema(
  {
    role: { type: String, required: true },
    content: { type: [Schema.Types.Mixed], required: true },
  },
  { _id: false, versionKey: false, minimize: false },
);

const pendingActionSchema = new Schema(
  {
    toolUseId: { type: String, required: true },
    toolName: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    summary: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false, versionKey: false, minimize: false },
);

const conversationSchema = new Schema<ConversationDocument>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
    pendingAction: { type: pendingActionSchema, default: null },
    isDeleted: { type: Boolean, required: true, default: false },
    version: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false, minimize: false },
);

// List a user's live conversations most-recently-active first. `isDeleted` is
// part of the key because every list query now filters on it.
conversationSchema.index({ ownerId: 1, isDeleted: 1, updatedAt: -1 });

export const ConversationModel = model<ConversationDocument>('Conversation', conversationSchema);
