import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';
import { postLoginRoute } from '@/shared/preferences/mode.store';

import { authApi } from '../data/auth.api';
import { useSessionStore } from '../session/session.store';
import { hasErrors, validateCredentials, type CredentialErrors } from './validation';

/** View-model for the login form. */
export function useLoginViewModel() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setSession(result.user, result);
      navigate(postLoginRoute(), { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateCredentials(email, password, { requireStrongPassword: false });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    mutation.mutate({ email: email.trim(), password });
  };

  return {
    email,
    password,
    setEmail,
    setPassword,
    fieldErrors,
    isSubmitting: mutation.isPending,
    formError: toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Invalid email or password.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
