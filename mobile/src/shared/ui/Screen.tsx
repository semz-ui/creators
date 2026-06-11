import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Large screen title rendered above the content. */
  title?: string;
  subtitle?: string;
  /** Right-aligned element next to the title (e.g. an action button). */
  headerRight?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** Standard page wrapper: safe area, canvas background, padded content. */
export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  headerRight,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const header =
    title !== undefined ? (
      <View className="mb-5 flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-display-bold text-3xl text-content">{title}</Text>
          {subtitle ? (
            <Text className="font-sans text-sm text-content-secondary">{subtitle}</Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  if (!scroll) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <View className="flex-1 px-5 pt-4">
          {header}
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {header}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
