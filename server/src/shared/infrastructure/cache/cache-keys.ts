/**
 * Builds a namespaced cache key from a namespace and one or more id parts,
 * e.g. `cacheKey('user', '123')` → `"user:123"`. Centralizing key construction
 * keeps namespaces consistent and collision-free across modules.
 */
export function cacheKey(namespace: string, ...parts: Array<string | number>): string {
  return [namespace, ...parts].join(':');
}
