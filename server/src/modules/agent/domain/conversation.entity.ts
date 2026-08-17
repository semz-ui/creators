import { randomUUID } from 'node:crypto';

import type { AgentContentBlock, AgentMessage } from './agent-message';
import { textBlock } from './agent-message';
import { PendingActionMismatchError, PendingActionRequiredError } from './agent.errors';

const TITLE_MAX = 80;

/**
 * A tool call the model wants to make that the user must approve first.
 * While one is set, the conversation's last message is an assistant turn with
 * an unanswered `tool_use` block — resolving it appends the matching
 * `tool_result` and lets the loop continue.
 */
export interface PendingAction {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  /** Human-readable description shown in the confirmation prompt. */
  summary: string;
  createdAt: Date;
}

/** Persistence-friendly representation of a Conversation. */
export interface ConversationSnapshot {
  id: string;
  ownerId: string;
  title: string;
  messages: AgentMessage[];
  pendingAction: PendingAction | null;
  /**
   * Soft-delete flag. A deleted conversation is not erased — the transcript
   * records real side effects (a charged generation, a published post), so it
   * stays readable in the database and only disappears from the API.
   */
  isDeleted: boolean;
  /**
   * Optimistic-concurrency counter: the revision this instance was loaded at.
   * A write only lands if the stored document is still at this revision, so
   * two concurrent turns can't silently clobber each other's messages.
   */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation aggregate — the message log of one chat with the agent, plus at
 * most one action awaiting the user's confirmation.
 */
export class Conversation {
  readonly id: string;
  readonly ownerId: string;
  readonly createdAt: Date;

  private _title: string;
  private _messages: AgentMessage[];
  private _pendingAction: PendingAction | null;
  private _isDeleted: boolean;
  private _version: number;
  private _updatedAt: Date;

  private constructor(snapshot: ConversationSnapshot) {
    this.id = snapshot.id;
    this.ownerId = snapshot.ownerId;
    this.createdAt = snapshot.createdAt;
    this._title = snapshot.title;
    this._messages = snapshot.messages;
    this._pendingAction = snapshot.pendingAction;
    this._isDeleted = snapshot.isDeleted;
    this._version = snapshot.version;
    this._updatedAt = snapshot.updatedAt;
  }

  get title(): string {
    return this._title;
  }
  /** The message log. Treat as read-only; mutate through the append methods. */
  get messages(): readonly AgentMessage[] {
    return this._messages;
  }
  get pendingAction(): PendingAction | null {
    return this._pendingAction;
  }
  get isDeleted(): boolean {
    return this._isDeleted;
  }
  get version(): number {
    return this._version;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(params: { ownerId: string; title?: string }): Conversation {
    const now = new Date();
    return new Conversation({
      id: randomUUID(),
      ownerId: params.ownerId,
      title: truncateTitle(params.title ?? 'New conversation'),
      messages: [],
      pendingAction: null,
      isDeleted: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromSnapshot(snapshot: ConversationSnapshot): Conversation {
    return new Conversation(snapshot);
  }

  /**
   * Guards a new turn. Sending one while an action is unresolved would leave
   * the pending `tool_use` block unanswered forever.
   */
  requireIdle(): void {
    if (this._pendingAction) {
      throw new PendingActionRequiredError(this._pendingAction.toolName);
    }
  }

  appendUser(text: string): void {
    // The first thing the user says names the conversation.
    if (this._messages.length === 0) {
      this._title = truncateTitle(text);
    }
    this._messages.push({ role: 'user', content: [textBlock(text)] });
    this.touch();
  }

  appendAssistant(content: AgentContentBlock[]): void {
    this._messages.push({ role: 'assistant', content });
    this.touch();
  }

  /**
   * Tool results are sent back in the `user` role — that is how the Messages
   * API models them, not because a human wrote them.
   */
  appendToolResults(content: AgentContentBlock[]): void {
    this._messages.push({ role: 'user', content });
    this.touch();
  }

  awaitConfirmation(action: PendingAction): void {
    this._pendingAction = action;
    this.touch();
  }

  /** Clears the pending action, returning it so the caller can execute it. */
  resolvePending(toolUseId: string): PendingAction {
    const pending = this._pendingAction;
    if (!pending || pending.toolUseId !== toolUseId) {
      throw new PendingActionMismatchError();
    }
    this._pendingAction = null;
    this.touch();
    return pending;
  }

  /**
   * Hides the conversation from the API without erasing it.
   *
   * Deliberately unguarded by `requireIdle`: abandoning a conversation that is
   * paused on a confirmation is a legitimate way to decline it, and refusing
   * to delete would leave the user stuck with a chat they can neither use nor
   * remove. The unanswered `tool_use` never reaches the model again.
   */
  softDelete(): void {
    this._isDeleted = true;
    this._pendingAction = null;
    this.touch();
  }

  /**
   * Called by the repository once a write has landed, so a second save from
   * the same instance targets the revision it just created.
   */
  markPersisted(): void {
    this._version += 1;
  }

  toSnapshot(): ConversationSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      title: this._title,
      messages: this._messages,
      pendingAction: this._pendingAction,
      isDeleted: this._isDeleted,
      version: this._version,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}

function truncateTitle(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New conversation';
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX - 1)}…` : trimmed;
}
