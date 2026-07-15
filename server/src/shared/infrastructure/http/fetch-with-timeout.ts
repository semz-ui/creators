import { env } from '../config/env';

export interface FetchTimeoutOptions {
  /** Abort budget in ms. Defaults to env.HTTP_CLIENT_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * `fetch` with an abort-based timeout. Node's fetch has no default timeout, so
 * a hung upstream would otherwise block indefinitely — most dangerously the
 * publishing scheduler, which awaits these calls. Every outbound call in the
 * social integration adapters goes through here.
 *
 * Uses AbortController + clearTimeout (not AbortSignal.timeout) so the timer is
 * released as soon as the response settles, leaving no dangling timers.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  options: FetchTimeoutOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? env.HTTP_CLIENT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    // Deliberately omit the URL — some carry tokens in the query string.
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
