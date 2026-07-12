import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ForgotPasswordPage() {
  const forgotPasswordViewModel = useForgotPasswordViewModel();

  return (
    <AuthFormLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered your password?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {forgotPasswordViewModel.isSubmitted ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-secondary">{forgotPasswordViewModel.successMessage}</p>
          <Link to="/login" className="text-sm text-brand hover:underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={forgotPasswordViewModel.onSubmit}
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={forgotPasswordViewModel.email}
            onChange={(e) => forgotPasswordViewModel.setEmail(e.target.value)}
            error={forgotPasswordViewModel.fieldErrors.email}
          />
          {forgotPasswordViewModel.formError && (
            <p className="text-sm text-danger">{forgotPasswordViewModel.formError}</p>
          )}
          <Button type="submit" size="lg" disabled={forgotPasswordViewModel.isSubmitting}>
            {forgotPasswordViewModel.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthFormLayout>
  );
}
