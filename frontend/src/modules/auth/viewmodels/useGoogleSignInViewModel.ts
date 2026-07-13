import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { env } from '@/shared/config/env';
import { HttpError } from '@/shared/data/http-error';

import { authApi } from '../data/auth.api';
import { renderGoogleButton } from '../data/google-identity';
import { useSessionStore } from '../session/session.store';

/**
 * Identity sent by the stub button when no Google client ID is configured.
 * The server's stub verifier (active when its GOOGLE_CLIENT_ID is also unset)
 * accepts `stub-google:<sub>:<email>` tokens, so sign-in works end-to-end
 * locally without Google credentials.
 */
const STUB_ID_TOKEN = 'stub-google:local-google-user:google.user@reelo.local';

/** View-model for "Continue with Google" on the login and signup pages. */
export function useGoogleSignInViewModel() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const [loadError, setLoadError] = useState(false);

  const mutation = useMutation({
    mutationFn: authApi.googleSignIn,
    onSuccess: (result) => {
      setSession(result);
      navigate('/dashboard', { replace: true });
    },
  });
  const { mutate } = mutation;

  const signInWithIdToken = useCallback((idToken: string) => mutate({ idToken }), [mutate]);

  /**
   * Ref callback for the GIS button container: loads the Google script and
   * renders the official button into it. No-op in stub mode.
   */
  const mountGoogleButton = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container || !env.googleClientId) return;
      renderGoogleButton(container, env.googleClientId, signInWithIdToken).catch(() =>
        setLoadError(true),
      );
    },
    [signInWithIdToken],
  );

  return {
    /** 'google' renders the real GIS button; 'stub' a plain local-dev button. */
    mode: env.googleClientId ? ('google' as const) : ('stub' as const),
    mountGoogleButton,
    signInWithIdToken,
    signInWithStub: () => signInWithIdToken(STUB_ID_TOKEN),
    isSubmitting: mutation.isPending,
    formError: toFormError(mutation.error, loadError),
  };
}

function toFormError(error: unknown, loadError: boolean): string | null {
  // The server's 401 messages here are user-appropriate (invalid token,
  // unverified Google email), so surface them as-is.
  if (error instanceof HttpError) return error.message;
  if (error) return 'Something went wrong. Please try again.';
  if (loadError) return 'Google sign-in could not be loaded. Please try again later.';
  return null;
}
