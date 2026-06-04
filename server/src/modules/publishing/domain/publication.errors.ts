import { NotFoundError, ValidationError } from '@shared/domain/errors';

/** Raised when a publication doesn't exist or isn't owned by the requester. */
export class PublicationNotFoundError extends NotFoundError {
  constructor() {
    super('Publication not found');
  }
}

/** Raised when the target video is missing, not owned, or not yet `ready`. */
export class VideoNotPublishableError extends ValidationError {
  constructor() {
    super('Video is not available for publishing (must exist and be ready)');
  }
}

/** Raised when the user has no active connection for a requested platform. */
export class NoActiveConnectionError extends ValidationError {
  constructor(platform: string) {
    super(`No active ${platform} connection`);
  }
}

/** Raised when no target platforms were provided. */
export class NoTargetsSpecifiedError extends ValidationError {
  constructor() {
    super('At least one target platform is required');
  }
}
