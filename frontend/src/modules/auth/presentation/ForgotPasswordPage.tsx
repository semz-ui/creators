import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ForgotPasswordPage() {
  const vm = useForgotPasswordViewModel();

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
      {vm.isSubmitted ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-secondary">{vm.successMessage}</p>
          <Link to="/login" className="text-sm text-brand hover:underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={vm.onSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={vm.email}
            onChange={(e) => vm.setEmail(e.target.value)}
            error={vm.fieldErrors.email}
          />
          {vm.formError && <p className="text-sm text-danger">{vm.formError}</p>}
          <Button type="submit" size="lg" disabled={vm.isSubmitting}>
            {vm.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthFormLayout>
  );
}
