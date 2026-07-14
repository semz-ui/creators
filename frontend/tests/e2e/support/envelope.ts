/** Serialize a success payload in the API's `{ success: true, data }` envelope. */
export function ok(data: unknown): string {
  return JSON.stringify({ success: true, data });
}
