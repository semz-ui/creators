import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from './BackButton';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Large screen title rendered above the content. */
  title?: string;
  subtitle?: string;
  /** Right-aligned element next to the title (e.g. an action button). */
  headerRight?: ReactNode;
  /** Show a back control above the title (for pushed, non-tab screens). */
  showBack?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Clears the floating glass tab bar so scroll content isn't hidden beneath it.
// (Harmless extra space on pushed screens, which aren't under the tab bar.)
const CONTENT_PADDING = 'px-5 pt-4 pb-28';

/** Standard page wrapper: safe area, canvas background, padded + glass-aware content. */
export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  headerRight,
  showBack = false,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const header = (
    <>
      {showBack ? <BackButton /> : null}
      {title !== undefined ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="mb-5 flex-row items-start justify-between gap-3"
        >
          <View className="flex-1 gap-1">
            <Text className="font-display-bold text-3xl text-content">{title}</Text>
            {subtitle ? (
              <Text className="font-sans text-sm text-content-secondary">{subtitle}</Text>
            ) : null}
          </View>
          {headerRight}
        </Animated.View>
      ) : null}
    </>
  );

  if (!scroll) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <View className="flex-1 px-5 pb-28 pt-4">
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
        contentContainerClassName={CONTENT_PADDING}
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
