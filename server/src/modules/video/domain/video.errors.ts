import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/errors';

/** Raised when a video doesn't exist or isn't owned by the requester. */
export class VideoNotFoundError extends NotFoundError {
  constructor() {
    super('Video not found');
  }
}

/** Raised on an illegal status transition (e.g. marking a failed video ready). */
export class InvalidVideoTransitionError extends ConflictError {
  constructor(from: string, to: string) {
    super(`Cannot transition video from "${from}" to "${to}"`);
  }
}

/** Raised for a video provider this app doesn't support. */
export class UnsupportedProviderError extends ValidationError {
  constructor(provider: string) {
    super(`Unsupported video provider: "${provider}"`);
  }
}

/**
 * Raised when a supported provider has no credentials configured on this
 * deployment. Thrown before any credits are charged.
 */
export class ProviderUnavailableError extends ValidationError {
  constructor(provider: string) {
    super(`Video provider "${provider}" is not configured on this server`);
  }
}

/** Raised by the Prompt value object. */
export class InvalidPromptError extends ValidationError {
  constructor(reason: string) {
    super(reason);
  }
}

/** Raised by the Duration value object. */
export class InvalidDurationError extends ValidationError {
  constructor(reason: string) {
    super(reason);
  }
}

/** Raised by the Title value object. */
export class InvalidTitleError extends ValidationError {
  constructor(reason: string) {
    super(reason);
  }
}

export class FileTooLargeError extends ValidationError {
  constructor(maxMb: number) {
    super(`File exceeds the ${maxMb}MB limit`);
  }
}

export class UnsupportedFileTypeError extends ValidationError {
  constructor(mimeType: string) {
    super(`Unsupported file type: ${mimeType}. Accepted: video/mp4, video/quicktime, video/webm`);
  }
}
