import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Field } from '@/shared/ui';

import { useResetPasswordViewModel } from '../viewmodels/useResetPasswordViewModel';
import { AuthFormLayout } from './AuthFormLayout';

export function ResetPasswordScreen() {
  const vm = useResetPasswordViewModel();

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
      {vm.isTokenMissing ? (
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
            value={vm.password}
            onChangeText={vm.setPassword}
            error={vm.fieldErrors.password}
            secureTextEntry
            autoComplete="new-password"
            placeholder="••••••••"
            onSubmitEditing={vm.onSubmit}
          />
          {vm.formError ? (
            <View className="gap-1">
              <Text className="font-sans text-sm text-danger">{vm.formError}</Text>
              {vm.isTokenError ? (
                <Link
                  href="/(auth)/forgot-password"
                  className="font-sans-semibold text-sm text-content-brand"
                >
                  Request a new link
                </Link>
              ) : null}
            </View>
          ) : null}
          <Button title="Reset password" onPress={vm.onSubmit} loading={vm.isSubmitting} block />
        </>
      )}
    </AuthFormLayout>
  );
}
