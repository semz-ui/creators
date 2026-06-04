import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/ui';

import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function RegisterPage() {
  const vm = useRegisterViewModel();

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
      <form className="flex flex-col gap-4" onSubmit={vm.onSubmit} noValidate>
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
          autoComplete="new-password"
          value={vm.password}
          onChange={(e) => vm.setPassword(e.target.value)}
          error={vm.fieldErrors.password}
        />
        {vm.formError && <p className="text-sm text-danger">{vm.formError}</p>}
        <Button type="submit" size="lg" disabled={vm.isSubmitting}>
          {vm.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
