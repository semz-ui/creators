import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { AuthFormLayout } from './AuthFormLayout';
import { GoogleSignInButton } from './GoogleSignInButton';

export function LoginPage() {
  const loginViewModel = useLoginViewModel();
  const location = useLocation();
  const navigate = useNavigate();
  // One-shot notice from a completed flow (e.g. password reset). Captured in
  // state and then cleared from the history entry, since router state persists
  // in history.state and would otherwise survive reloads and tab restores.
  const [notice] = useState(() => (location.state as { notice?: string } | null)?.notice);

  useEffect(() => {
    if (notice) navigate(location.pathname, { replace: true, state: null });
  }, [notice, navigate, location.pathname]);

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Log in to your Reelo studio."
      footer={
        <>
          New to Reelo?{' '}
          <Link to="/signup" className="text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={loginViewModel.onSubmit} noValidate>
        {notice && <p className="text-sm text-success">{notice}</p>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={loginViewModel.email}
          onChange={(e) => loginViewModel.setEmail(e.target.value)}
          error={loginViewModel.fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={loginViewModel.password}
          onChange={(e) => loginViewModel.setPassword(e.target.value)}
          error={loginViewModel.fieldErrors.password}
        />
        <Link to="/forgot-password" className="self-end text-sm text-brand hover:underline">
          Forgot password?
        </Link>
        {loginViewModel.formError && (
          <p className="text-sm text-danger">{loginViewModel.formError}</p>
        )}
        <Button type="submit" size="lg" disabled={loginViewModel.isSubmitting}>
          {loginViewModel.isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <GoogleSignInButton />
    </AuthFormLayout>
  );
}
