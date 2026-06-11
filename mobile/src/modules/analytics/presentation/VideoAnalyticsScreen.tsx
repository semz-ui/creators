import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PLATFORMS } from '@/modules/connections/data/connections.types';
import { formatDateTime } from '@/shared/lib/format';
import { Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { useVideoAnalytics } from '../viewmodels/useVideoAnalytics';
import { MetricsGrid } from './MetricsGrid';

const platformLabel = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function VideoAnalyticsScreen({ videoId }: { videoId: string }) {
  const router = useRouter();
  const analytics = useVideoAnalytics(videoId);

  return (
    <Screen title="Video analytics">
      <Pressable
        onPress={() => router.back()}
        className="-mt-2 mb-4 flex-row items-center gap-1 self-start"
      >
        <Ionicons name="chevron-back" size={16} color="#0284c7" />
        <Text className="font-sans-medium text-sm text-content-brand">Back</Text>
      </Pressable>

      {analytics.isPending ? (
        <Spinner />
      ) : analytics.isError ? (
        <EmptyState title="Couldn't load analytics" message="Pull to refresh to try again." />
      ) : (
        <View className="gap-4">
          <Card className="gap-2">
            <Text className="font-display text-lg text-content">Totals</Text>
            <MetricsGrid metrics={analytics.data.totals} />
          </Card>

          {analytics.data.byPlatform.length === 0 ? (
            <EmptyState
              title="No analytics yet"
              message="Publish this video and refresh to see metrics."
            />
          ) : (
            analytics.data.byPlatform.map((entry) => (
              <Card key={entry.platform} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-base text-content">
                    {platformLabel(entry.platform)}
                  </Text>
                  <Text className="font-sans text-xs text-content-muted">
                    Updated {formatDateTime(entry.syncedAt)}
                  </Text>
                </View>
                <MetricsGrid metrics={entry.metrics} />
              </Card>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}
