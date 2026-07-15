import { env } from '../config/env';

export interface FetchTimeoutOptions {
  /** Abort budget in ms. Defaults to env.HTTP_CLIENT_TIMEOUT_MS. */
  timeoutMs?: number;
}

/** A response whose body has already been read under the timeout window. */
export interface BufferedResponse {
  ok: boolean;
  status: number;
  statusText: string;
  buffer: ArrayBuffer;
}

/**
 * `fetch` with an abort-based timeout. Node's fetch has no default timeout, so
 * a hung upstream would otherwise block indefinitely — most dangerously the
 * publishing scheduler, which awaits these calls.
 *
 * The budget bounds time-to-response-headers, and the timer is released as soon
 * as `fetch` settles. That fully covers small JSON/metadata calls (the body
 * arrives with the headers) and requests where only a header is read. It does
 * NOT bound reading a large streamed body — a caller that reads the body after
 * this returns is unprotected once the body stalls mid-stream. For byte
 * transfers use {@link fetchBufferWithTimeout}, which reads the body under the
 * same budget.
 *
 * Uses AbortController + clearTimeout (not AbortSignal.timeout) so the timer is
 * released when the response settles, leaving no dangling timers.
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

/**
 * Like {@link fetchWithTimeout}, but reads the full response body into an
 * ArrayBuffer *before* releasing the timer, so the budget bounds the entire
 * byte transfer — not just time-to-first-byte. Use this for downloads: a CDN
 * that answers with headers instantly then stalls mid-stream is aborted here,
 * whereas a bare fetch + `res.arrayBuffer()` on the next line would hang.
 */
export async function fetchBufferWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  options: FetchTimeoutOptions = {},
): Promise<BufferedResponse> {
  const timeoutMs = options.timeoutMs ?? env.HTTP_CLIENT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    // Read the body while the timer is still armed, so a mid-stream stall aborts.
    const buffer = await res.arrayBuffer();
    return { ok: res.ok, status: res.status, statusText: res.statusText, buffer };
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
