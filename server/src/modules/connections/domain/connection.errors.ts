import { AppError, NotFoundError, UnauthorizedError, ValidationError } from '@shared/domain/errors';

/** Raised when a connection doesn't exist or isn't owned by the requester. */
export class ConnectionNotFoundError extends NotFoundError {
  constructor() {
    super('Connection not found');
  }
}

/** Raised for an unknown social platform. */
export class UnsupportedPlatformError extends ValidationError {
  constructor(platform: string) {
    super(`Unsupported platform: "${platform}"`);
  }
}

/** Raised when the OAuth callback state is missing, expired, or already used. */
export class InvalidOAuthStateError extends UnauthorizedError {
  constructor() {
    super('Invalid or expired OAuth state');
  }
}

/** Raised when exchanging the authorization code with the provider fails (upstream). */
export class OAuthExchangeFailedError extends AppError {
  readonly statusCode = 502;
  readonly code = 'OAUTH_EXCHANGE_FAILED';

  constructor() {
    super('Failed to complete the OAuth exchange with the provider');
  }
}
