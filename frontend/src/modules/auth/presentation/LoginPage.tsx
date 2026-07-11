import { Link, useLocation } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function LoginPage() {
  const vm = useLoginViewModel();
  // One-shot notice from a completed flow (e.g. password reset) via router state.
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

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
      <form className="flex flex-col gap-4" onSubmit={vm.onSubmit} noValidate>
        {notice && <p className="text-sm text-success">{notice}</p>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={vm.email}
          onChange={(e) => vm.setEmail(e.target.value)}
          error={vm.fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={vm.password}
          onChange={(e) => vm.setPassword(e.target.value)}
          error={vm.fieldErrors.password}
        />
        <Link to="/forgot-password" className="self-end text-sm text-brand hover:underline">
          Forgot password?
        </Link>
        {vm.formError && <p className="text-sm text-danger">{vm.formError}</p>}
        <Button type="submit" size="lg" disabled={vm.isSubmitting}>
          {vm.isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
