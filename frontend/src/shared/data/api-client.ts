import { env } from '@/shared/config/env';

import { HttpError, type ApiErrorBody } from './http-error';

/** Envelope every successful API response arrives in. */
interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Attach the Bearer access token (default true). Set false for public routes. */
  auth?: boolean;
  /** Internal: marks a retry after a token refresh, to avoid infinite loops. */
  _retried?: boolean;
}

export interface ApiClientHooks {
  /** Returns the current access token, or null when unauthenticated. */
  getToken: () => string | null;
  /** Attempts to refresh the session; resolves true if a new token is available. */
  refresh: () => Promise<boolean>;
}

/**
 * Thin fetch wrapper and the ONLY place the app talks to the network. Attaches
 * the Bearer token, and transparently refreshes once on a 401 then retries.
 * Auth wiring (token getter + refresh) is injected by the auth module via
 * {@link configure}; until then requests are made unauthenticated.
 */
export class ApiClient {
  private getToken: () => string | null = () => null;
  private refresh: (() => Promise<boolean>) | null = null;

  constructor(private readonly baseUrl: string) {}

  configure(hooks: ApiClientHooks): void {
    this.getToken = hooks.getToken;
    this.refresh = hooks.refresh;
  }

  getAuthToken(): string | null {
    return this.getToken();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...options.headers };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.auth !== false) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const init: RequestInit = { method: options.method ?? 'GET', headers };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (response.status === 401 && this.refresh && options.auth !== false && !options._retried) {
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.request<T>(path, { ...options, _retried: true });
      }
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      const body = data as ApiErrorBody | undefined;
      throw new HttpError(
        response.status,
        body?.error?.code ?? 'ERROR',
        body?.error?.message ?? response.statusText,
        body?.error?.details,
      );
    }

    // Unwrap the { success, data } envelope; 204/empty bodies stay undefined.
    return (data as ApiSuccessBody<T> | undefined)?.data as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

/** Shared singleton, pointed at the configured API base URL. */
export const apiClient = new ApiClient(env.apiUrl);
