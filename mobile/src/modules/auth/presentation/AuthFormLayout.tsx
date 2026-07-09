import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/shared/ui';

/** Centered card layout shared by the login and register screens. */
export function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center gap-2">
            <Text className="font-display-bold text-4xl text-content-brand">Reelo</Text>
            <Text className="font-display text-xl text-content">{title}</Text>
            <Text className="font-sans text-sm text-content-secondary">{subtitle}</Text>
          </View>
          <Card className="gap-4">{children}</Card>
          <View className="mt-6 items-center">{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
