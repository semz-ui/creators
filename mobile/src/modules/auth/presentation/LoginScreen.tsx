import { Link } from 'expo-router';
import { Text } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function LoginScreen() {
  const vm = useLoginViewModel();

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
      {vm.formError ? <Text className="font-sans text-sm text-danger">{vm.formError}</Text> : null}
      <Button title="Log in" onPress={vm.onSubmit} loading={vm.isSubmitting} block />
    </AuthFormLayout>
  );
}
