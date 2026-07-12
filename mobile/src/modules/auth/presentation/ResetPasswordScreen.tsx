import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useResetPasswordViewModel } from '../viewmodels/useResetPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ResetPasswordScreen() {
  const resetPasswordViewModel = useResetPasswordViewModel();

  return (
    <AuthFormLayout
      title="Choose a new password"
      subtitle="Set a new password for your account"
      footer={
        <Text className="font-sans text-sm text-content-secondary">
          Remembered your password?{' '}
          <Link href="/(auth)/login" className="font-sans-semibold text-content-brand">
            Log in
          </Link>
        </Text>
      }
    >
      {resetPasswordViewModel.isTokenMissing ? (
        <View className="gap-4">
          <Text className="font-sans text-sm text-danger">
            This reset link is invalid or incomplete.
          </Text>
          <Link
            href="/(auth)/forgot-password"
            className="font-sans-semibold text-sm text-content-brand"
          >
            Request a new link
          </Link>
        </View>
      ) : (
        <>
          <Field
            label="New password"
            value={resetPasswordViewModel.password}
            onChangeText={resetPasswordViewModel.setPassword}
            error={resetPasswordViewModel.fieldErrors.password}
            secureTextEntry
            autoComplete="new-password"
            placeholder="••••••••"
            onSubmitEditing={resetPasswordViewModel.onSubmit}
          />
          {resetPasswordViewModel.formError ? (
            <View className="gap-1">
              <Text className="font-sans text-sm text-danger">
                {resetPasswordViewModel.formError}
              </Text>
              {resetPasswordViewModel.isTokenError ? (
                <Link
                  href="/(auth)/forgot-password"
                  className="font-sans-semibold text-sm text-content-brand"
                >
                  Request a new link
                </Link>
              ) : null}
            </View>
          ) : null}
          <Button
            title="Reset password"
            onPress={resetPasswordViewModel.onSubmit}
            loading={resetPasswordViewModel.isSubmitting}
            block
          />
        </>
      )}
    </AuthFormLayout>
  );
}
