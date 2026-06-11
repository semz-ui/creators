import { randomUUID } from 'node:crypto';

import type { OAuthAccount, RefreshedTokens } from './ports/oauth-provider';
import type { Platform } from './platform';

export type ConnectionStatus = 'active' | 'revoked' | 'expired';

/** Persistence-friendly representation of a Connection (tokens in plaintext here). */
export interface ConnectionSnapshot {
  id: string;
  userId: string;
  platform: Platform;
  externalAccountId: string;
  displayName: string;
  scopes: string[];
  status: ConnectionStatus;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A user's linked social account. Holds the OAuth tokens (encrypted at the
 * persistence boundary, never exposed via {@link toPublic}).
 */
export class Connection {
  readonly id: string;
  readonly userId: string;
  readonly platform: Platform;
  readonly createdAt: Date;

  private _externalAccountId: string;
  private _displayName: string;
  private _scopes: string[];
  private _status: ConnectionStatus;
  private _accessToken: string;
  private _refreshToken: string | null;
  private _expiresAt: Date | null;
  private _updatedAt: Date;

  private constructor(s: ConnectionSnapshot) {
    this.id = s.id;
    this.userId = s.userId;
    this.platform = s.platform;
    this.createdAt = s.createdAt;
    this._externalAccountId = s.externalAccountId;
    this._displayName = s.displayName;
    this._scopes = s.scopes;
    this._status = s.status;
    this._accessToken = s.accessToken;
    this._refreshToken = s.refreshToken;
    this._expiresAt = s.expiresAt;
    this._updatedAt = s.updatedAt;
  }

  get status(): ConnectionStatus {
    return this._status;
  }
  get displayName(): string {
    return this._displayName;
  }
  get externalAccountId(): string {
    return this._externalAccountId;
  }
  get scopes(): string[] {
    return this._scopes;
  }
  get accessToken(): string {
    return this._accessToken;
  }
  get refreshToken(): string | null {
    return this._refreshToken;
  }
  get expiresAt(): Date | null {
    return this._expiresAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(params: { userId: string; platform: Platform; account: OAuthAccount }): Connection {
    const now = new Date();
    return new Connection({
      id: randomUUID(),
      userId: params.userId,
      platform: params.platform,
      externalAccountId: params.account.externalAccountId,
      displayName: params.account.displayName,
      scopes: params.account.scopes,
      status: 'active',
      accessToken: params.account.accessToken,
      refreshToken: params.account.refreshToken,
      expiresAt: params.account.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromSnapshot(snapshot: ConnectionSnapshot): Connection {
    return new Connection(snapshot);
  }

  /** Re-link with a fresh account/token set (re-running OAuth for the same platform). */
  reconnect(account: OAuthAccount): void {
    this._externalAccountId = account.externalAccountId;
    this._displayName = account.displayName;
    this._scopes = account.scopes;
    this._accessToken = account.accessToken;
    this._refreshToken = account.refreshToken;
    this._expiresAt = account.expiresAt;
    this._status = 'active';
    this.touch();
  }

  markRevoked(): void {
    this._status = 'revoked';
    this.touch();
  }

  /** Refresh failed or impossible — the user must reconnect. */
  markExpired(): void {
    this._status = 'expired';
    this.touch();
  }

  /** True when the access token expires within the buffer. Null expiry = never expires. */
  needsRefresh(bufferSeconds: number, now: Date = new Date()): boolean {
    if (this._status !== 'active' || this._expiresAt === null) {
      return false;
    }
    return this._expiresAt.getTime() - now.getTime() <= bufferSeconds * 1000;
  }

  /** Apply a refreshed token set, keeping the stored refresh token when not rotated. */
  applyRefreshedTokens(tokens: RefreshedTokens): void {
    this._accessToken = tokens.accessToken;
    if (tokens.refreshToken !== null) {
      this._refreshToken = tokens.refreshToken;
    }
    this._expiresAt = tokens.expiresAt;
    this.touch();
  }

  toSnapshot(): ConnectionSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      platform: this.platform,
      externalAccountId: this._externalAccountId,
      displayName: this._displayName,
      scopes: this._scopes,
      status: this._status,
      accessToken: this._accessToken,
      refreshToken: this._refreshToken,
      expiresAt: this._expiresAt,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
