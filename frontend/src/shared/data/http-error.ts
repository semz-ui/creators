/** Shape of the API's error envelope (mirrors the server's error handler). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

/** Thrown by the API client on any non-2xx response. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}
