import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useResetPasswordViewModel } from '../viewmodels/useResetPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ResetPasswordPage() {
  const resetPasswordViewModel = useResetPasswordViewModel();

  return (
    <AuthFormLayout
      title="Choose a new password"
      subtitle="Set a new password for your account."
      footer={
        <>
          Remembered your password?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {resetPasswordViewModel.isTokenMissing ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-danger">This reset link is invalid or incomplete.</p>
          <Link to="/forgot-password" className="text-sm text-brand hover:underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={resetPasswordViewModel.onSubmit} noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={resetPasswordViewModel.password}
            onChange={(e) => resetPasswordViewModel.setPassword(e.target.value)}
            error={resetPasswordViewModel.fieldErrors.password}
          />
          {resetPasswordViewModel.formError && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-danger">{resetPasswordViewModel.formError}</p>
              {resetPasswordViewModel.isTokenError && (
                <Link to="/forgot-password" className="text-sm text-brand hover:underline">
                  Request a new link
                </Link>
              )}
            </div>
          )}
          <Button type="submit" size="lg" disabled={resetPasswordViewModel.isSubmitting}>
            {resetPasswordViewModel.isSubmitting ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      )}
    </AuthFormLayout>
  );
}
