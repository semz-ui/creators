/**
 * Wrap a success payload in the API's `{ success: true, data }` envelope, for
 * `HttpResponse.json(ok(data))`. Mirrors `tests/e2e/support/envelope.ts`, which
 * serializes instead because Playwright's `route.fulfill` takes a string body.
 */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
