/**
 * Frontend runtime configuration, read from Vite env vars (must be VITE_*).
 * Import this instead of touching `import.meta.env` directly.
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000',
} as const;
