import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ForgotPasswordScreen() {
  const forgotPasswordViewModel = useForgotPasswordViewModel();

  return (
    <AuthFormLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Text className="font-sans text-sm text-content-secondary">
          Remembered your password?{' '}
          <Link href="/(auth)/login" className="font-sans-semibold text-content-brand">
            Log in
          </Link>
        </Text>
      }
    >
      {forgotPasswordViewModel.isSubmitted ? (
        <View className="gap-4">
          <Text className="font-sans text-sm text-content-secondary">
            {forgotPasswordViewModel.successMessage}
          </Text>
          <Link href="/(auth)/login" className="font-sans-semibold text-sm text-content-brand">
            Back to log in
          </Link>
        </View>
      ) : (
        <>
          <Field
            label="Email"
            value={forgotPasswordViewModel.email}
            onChangeText={forgotPasswordViewModel.setEmail}
            error={forgotPasswordViewModel.fieldErrors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            onSubmitEditing={forgotPasswordViewModel.onSubmit}
          />
          {forgotPasswordViewModel.formError ? (
            <Text className="font-sans text-sm text-danger">
              {forgotPasswordViewModel.formError}
            </Text>
          ) : null}
          <Button
            title="Send reset link"
            onPress={forgotPasswordViewModel.onSubmit}
            loading={forgotPasswordViewModel.isSubmitting}
            block
          />
        </>
      )}
    </AuthFormLayout>
  );
}
