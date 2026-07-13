/**
 * Frontend runtime configuration, read from Vite env vars (must be VITE_*).
 * Import this instead of touching `import.meta.env` directly.
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000',
  /** Google OAuth web client ID. Unset → the stub "Continue with Google" button. */
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null,
} as const;

/** True in the Vite dev server / non-production builds. */
export const isDevelopment = import.meta.env.DEV;
