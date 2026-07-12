import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function LoginScreen() {
  const vm = useLoginViewModel();
  const router = useRouter();
  const params = useLocalSearchParams<{ notice?: string }>();
  // One-shot notice from a completed flow (e.g. password reset). Captured in
  // state and then cleared from the route params so a restored navigation
  // stack doesn't resurrect it.
  const [notice] = useState(() => (typeof params.notice === 'string' ? params.notice : null));

  useEffect(() => {
    if (notice) router.setParams({ notice: '' });
  }, [notice, router]);

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Log in to keep creating"
      footer={
        <Text className="font-sans text-sm text-content-secondary">
          New to Reelo?{' '}
          <Link href="/(auth)/register" className="font-sans-semibold text-content-brand">
            Sign up
          </Link>
        </Text>
      }
    >
      {notice ? <Text className="font-sans text-sm text-success">{notice}</Text> : null}
      <Field
        label="Email"
        value={vm.email}
        onChangeText={vm.setEmail}
        error={vm.fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={vm.password}
        onChangeText={vm.setPassword}
        error={vm.fieldErrors.password}
        secureTextEntry
        autoComplete="password"
        placeholder="••••••••"
        onSubmitEditing={vm.onSubmit}
      />
      <Link
        href="/(auth)/forgot-password"
        className="self-end font-sans text-sm text-content-brand"
      >
        Forgot password?
      </Link>
      {vm.formError ? <Text className="font-sans text-sm text-danger">{vm.formError}</Text> : null}
      <Button title="Log in" onPress={vm.onSubmit} loading={vm.isSubmitting} block />
    </AuthFormLayout>
  );
}
