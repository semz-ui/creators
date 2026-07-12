import { Link } from 'expo-router';
import { Text } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function RegisterScreen() {
  const registerViewModel = useRegisterViewModel();

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
        value={registerViewModel.email}
        onChangeText={registerViewModel.setEmail}
        error={registerViewModel.fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={registerViewModel.password}
        onChangeText={registerViewModel.setPassword}
        error={registerViewModel.fieldErrors.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="At least 8 characters"
        onSubmitEditing={registerViewModel.onSubmit}
      />
      {registerViewModel.formError ? (
        <Text className="font-sans text-sm text-danger">{registerViewModel.formError}</Text>
      ) : null}
      <Button
        title="Sign up"
        onPress={registerViewModel.onSubmit}
        loading={registerViewModel.isSubmitting}
        block
      />
    </AuthFormLayout>
  );
}
