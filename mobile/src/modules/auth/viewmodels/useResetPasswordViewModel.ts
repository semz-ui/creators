import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { HttpError } from '@/shared/data/http-error';

import { authApi } from '../data/auth.api';
import { validateNewPassword } from './validation';

/** View-model for the reset-password (choose new password) form. */
export function useResetPasswordViewModel() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' && params.token.length > 0 ? params.token : null;

  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string }>({});

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      // The server revoked every session — the user must log in again.
      router.replace({
        pathname: '/(auth)/login',
        params: { notice: 'Your password has been reset. Log in with your new password.' },
      });
    },
  });

  const onSubmit = () => {
    if (!token) return;
    const passwordError = validateNewPassword(password);
    setFieldErrors(passwordError ? { password: passwordError } : {});
    if (passwordError) return;
    mutation.mutate({ token, password });
  };

  return {
    password,
    setPassword,
    fieldErrors,
    isTokenMissing: !token,
    isTokenError: mutation.error instanceof HttpError && mutation.error.status === 401,
    isSubmitting: mutation.isPending,
    formError: toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 401) {
      return 'This reset link is invalid or has expired — request a new one.';
    }
    if (error.status === 422) return 'Password must be between 8 and 72 characters.';
    if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
