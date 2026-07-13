import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel';
import { AuthFormLayout } from './AuthFormLayout';
import { GoogleSignInButton } from './GoogleSignInButton';

export function RegisterPage() {
  const registerViewModel = useRegisterViewModel();

  return (
    <AuthFormLayout
      title="Create your account"
      subtitle="Start turning prompts into videos."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={registerViewModel.onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={registerViewModel.email}
          onChange={(e) => registerViewModel.setEmail(e.target.value)}
          error={registerViewModel.fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={registerViewModel.password}
          onChange={(e) => registerViewModel.setPassword(e.target.value)}
          error={registerViewModel.fieldErrors.password}
        />
        {registerViewModel.formError && (
          <p className="text-sm text-danger">{registerViewModel.formError}</p>
        )}
        <Button type="submit" size="lg" disabled={registerViewModel.isSubmitting}>
          {registerViewModel.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <GoogleSignInButton />
    </AuthFormLayout>
  );
}
