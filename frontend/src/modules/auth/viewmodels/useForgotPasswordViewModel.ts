import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { HttpError } from '@/shared/data/http-error';

import { authApi } from '../data/auth.api';
import { validateEmail } from './validation';

// Fallback for the anti-enumeration copy; the server's 202 body carries the same text.
const GENERIC_SUCCESS = 'If an account exists for that email, a password reset link has been sent.';

/** View-model for the forgot-password (request reset link) form. */
export function useForgotPasswordViewModel() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  const mutation = useMutation({ mutationFn: authApi.forgotPassword });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const emailError = validateEmail(email);
    setFieldErrors(emailError ? { email: emailError } : {});
    if (emailError) return;
    mutation.mutate({ email: email.trim() });
  };

  return {
    email,
    setEmail,
    fieldErrors,
    isSubmitting: mutation.isPending,
    isSubmitted: mutation.isSuccess,
    successMessage: mutation.data?.message ?? GENERIC_SUCCESS,
    formError: toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (error.status === 422) return 'Enter a valid email address';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
