import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { authApi } from '../data/auth.api';
import { useSessionStore } from '../session/session.store';
import { hasErrors, validateCredentials, type CredentialErrors } from './validation';

/** View-model for the registration form. */
export function useRegisterViewModel() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => {
      setSession(result);
      navigate('/dashboard', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateCredentials(email, password, { requireStrongPassword: true });
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
    if (error.status === 409) return 'An account with this email already exists.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
