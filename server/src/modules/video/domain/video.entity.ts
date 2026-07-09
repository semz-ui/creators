import { randomUUID } from 'node:crypto';

import { InvalidVideoTransitionError } from './video.errors';
import type { Duration } from './value-objects/duration';
import type { Prompt } from './value-objects/prompt';

export type VideoStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type VideoSource = 'generated' | 'uploaded';

const TERMINAL: ReadonlySet<VideoStatus> = new Set(['ready', 'failed']);

/** Persistence-friendly representation of a Video. */
export interface VideoSnapshot {
  id: string;
  ownerId: string;
  source: VideoSource;
  title: string | null;
  prompt: string;
  durationSeconds: number;
  status: VideoStatus;
  jobRef: string | null;
  resultUrl: string | null;
  error: string | null;
  /** Optional audio settings, chosen at creation and applied on completion. */
  musicTrackId: string | null;
  narrationText: string | null;
  narrationVoice: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video aggregate. A generation job moves through
 * `queued → processing → ready | failed`; transition methods enforce the
 * legal moves so invalid states can't be reached.
 */
export class Video {
  readonly id: string;
  readonly ownerId: string;
  readonly source: VideoSource;
  readonly title: string | null;
  readonly prompt: string;
  readonly durationSeconds: number;
  readonly musicTrackId: string | null;
  readonly narrationText: string | null;
  readonly narrationVoice: string | null;
  readonly createdAt: Date;

  private _status: VideoStatus;
  private _jobRef: string | null;
  private _resultUrl: string | null;
  private _error: string | null;
  private _updatedAt: Date;

  private constructor(snapshot: VideoSnapshot) {
    this.id = snapshot.id;
    this.ownerId = snapshot.ownerId;
    this.source = snapshot.source;
    this.title = snapshot.title;
    this.prompt = snapshot.prompt;
    this.durationSeconds = snapshot.durationSeconds;
    this.musicTrackId = snapshot.musicTrackId;
    this.narrationText = snapshot.narrationText;
    this.narrationVoice = snapshot.narrationVoice;
    this.createdAt = snapshot.createdAt;
    this._status = snapshot.status;
    this._jobRef = snapshot.jobRef;
    this._resultUrl = snapshot.resultUrl;
    this._error = snapshot.error;
    this._updatedAt = snapshot.updatedAt;
  }

  get status(): VideoStatus {
    return this._status;
  }
  get jobRef(): string | null {
    return this._jobRef;
  }
  get resultUrl(): string | null {
    return this._resultUrl;
  }
  get error(): string | null {
    return this._error;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(params: {
    ownerId: string;
    prompt: Prompt;
    duration: Duration;
    musicTrackId?: string | null;
    narrationText?: string | null;
    narrationVoice?: string | null;
  }): Video {
    const now = new Date();
    return new Video({
      id: randomUUID(),
      ownerId: params.ownerId,
      source: 'generated',
      title: null,
      prompt: params.prompt.value,
      durationSeconds: params.duration.seconds,
      status: 'queued',
      jobRef: null,
      resultUrl: null,
      error: null,
      musicTrackId: params.musicTrackId ?? null,
      narrationText: params.narrationText ?? null,
      narrationVoice: params.narrationVoice ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static createUploaded(params: {
    ownerId: string;
    title: string;
    resultUrl: string;
    durationSeconds: number;
  }): Video {
    const now = new Date();
    return new Video({
      id: randomUUID(),
      ownerId: params.ownerId,
      source: 'uploaded',
      title: params.title,
      prompt: '',
      durationSeconds: params.durationSeconds,
      status: 'ready',
      jobRef: null,
      resultUrl: params.resultUrl,
      error: null,
      musicTrackId: null,
      narrationText: null,
      narrationVoice: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromSnapshot(snapshot: VideoSnapshot): Video {
    return new Video(snapshot);
  }

  /** Job accepted by the generator. */
  markProcessing(jobRef: string): void {
    if (this._status !== 'queued') {
      throw new InvalidVideoTransitionError(this._status, 'processing');
    }
    this._status = 'processing';
    this._jobRef = jobRef;
    this.touch();
  }

  /** Generation succeeded. */
  markReady(resultUrl: string): void {
    if (this._status !== 'processing') {
      throw new InvalidVideoTransitionError(this._status, 'ready');
    }
    this._status = 'ready';
    this._resultUrl = resultUrl;
    this.touch();
  }

  /** Generation failed (allowed from queued or processing). */
  markFailed(reason: string): void {
    if (this._status !== 'queued' && this._status !== 'processing') {
      throw new InvalidVideoTransitionError(this._status, 'failed');
    }
    this._status = 'failed';
    this._error = reason;
    this.touch();
  }

  /** True once the video has reached a terminal state (ready/failed). */
  isTerminal(): boolean {
    return TERMINAL.has(this._status);
  }

  toSnapshot(): VideoSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      source: this.source,
      title: this.title,
      prompt: this.prompt,
      durationSeconds: this.durationSeconds,
      status: this._status,
      jobRef: this._jobRef,
      resultUrl: this._resultUrl,
      error: this._error,
      musicTrackId: this.musicTrackId,
      narrationText: this.narrationText,
      narrationVoice: this.narrationVoice,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
