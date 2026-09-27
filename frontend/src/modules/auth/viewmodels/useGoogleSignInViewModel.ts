import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { env } from '@/shared/config/env';
import { HttpError } from '@/shared/data/http-error';
import { postLoginRoute } from '@/shared/preferences/mode.store';

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.googleSignIn,
    onSuccess: (result) => {
      setSession(result.user, result);
      navigate(postLoginRoute(), { replace: true });
    },
  });
  const { mutate } = mutation;

  const signInWithIdToken = useCallback((idToken: string) => mutate({ idToken }), [mutate]);

  const renderButtonIntoContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container || !env.googleClientId) return;
    setLoadError(false);
    renderGoogleButton(container, env.googleClientId, signInWithIdToken).catch(() =>
      setLoadError(true),
    );
  }, [signInWithIdToken]);

  /**
   * Ref callback for the GIS button container: loads the Google script and
   * renders the official button into it. No-op in stub mode.
   */
  const mountGoogleButton = useCallback(
    (container: HTMLDivElement | null) => {
      containerRef.current = container;
      if (container) renderButtonIntoContainer();
    },
    [renderButtonIntoContainer],
  );

  return {
    /** 'google' renders the real GIS button; 'stub' a plain local-dev button. */
    mode: env.googleClientId ? ('google' as const) : ('stub' as const),
    mountGoogleButton,
    /** True when the GIS script failed to load; cleared by retryGoogleButton. */
    loadError,
    retryGoogleButton: renderButtonIntoContainer,
    signInWithIdToken,
    signInWithStub: () => signInWithIdToken(STUB_ID_TOKEN),
    isSubmitting: mutation.isPending,
    formError: toFormError(mutation.error),
  };
}

function toFormError(error: unknown): string | null {
  // The server's 401 messages here are user-appropriate (invalid token,
  // unverified Google email), so surface them as-is.
  if (error instanceof HttpError) return error.message;
  if (error) return 'Something went wrong. Please try again.';
  return null;
}
