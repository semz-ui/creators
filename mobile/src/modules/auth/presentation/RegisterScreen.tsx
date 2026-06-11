import { Link } from 'expo-router';
import { Text } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function RegisterScreen() {
  const vm = useRegisterViewModel();

  return (
    <AuthFormLayout
      title="Create your account"
      subtitle="Prompt in. Video out. Everywhere."
      footer={
        <Text className="font-sans text-sm text-content-secondary">
          Already have an account?{' '}
          <Link href="/(auth)/login" className="font-sans-semibold text-content-brand">
            Log in
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
        autoComplete="new-password"
        placeholder="At least 8 characters"
        onSubmitEditing={vm.onSubmit}
      />
      {vm.formError ? <Text className="font-sans text-sm text-danger">{vm.formError}</Text> : null}
      <Button title="Sign up" onPress={vm.onSubmit} loading={vm.isSubmitting} block />
    </AuthFormLayout>
  );
}
