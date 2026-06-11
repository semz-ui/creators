import { Text, View } from 'react-native';

import { PLATFORMS } from '@/modules/connections/data/connections.types';
import { Button, Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { useOverview } from '../viewmodels/useOverview';
import { useRefreshAnalytics } from '../viewmodels/useRefreshAnalytics';
import { MetricsGrid } from './MetricsGrid';

const platformLabel = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function AnalyticsOverviewScreen() {
  const overview = useOverview();
  const { refresh, isRefreshing } = useRefreshAnalytics();

  return (
    <Screen
      title="Analytics"
      subtitle="Engagement across your published videos"
      headerRight={
        <Button
          title={isRefreshing ? 'Refreshing…' : 'Refresh'}
          variant="secondary"
          size="sm"
          loading={isRefreshing}
          onPress={refresh}
        />
      }
      refreshing={overview.isRefetching}
      onRefresh={() => void overview.refetch()}
    >
      {overview.isPending ? (
        <Spinner />
      ) : overview.isError ? (
        <EmptyState title="Couldn't load analytics" message="Pull to refresh to try again." />
      ) : (
        <View className="gap-4">
          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-lg text-content">Totals</Text>
              <Text className="font-sans text-xs text-content-muted">
                {overview.data.videoCount} video{overview.data.videoCount === 1 ? '' : 's'}
              </Text>
            </View>
            <MetricsGrid metrics={overview.data.totals} />
          </Card>

          {overview.data.byPlatform.length > 0 ? (
            <Card className="gap-4">
              <Text className="font-display text-lg text-content">By platform</Text>
              {overview.data.byPlatform.map(({ platform, metrics }) => (
                <View key={platform} className="gap-1 border-t border-line-subtle pt-3">
                  <Text className="font-sans-semibold text-sm text-content">
                    {platformLabel(platform)}
                  </Text>
                  <MetricsGrid metrics={metrics} />
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="No analytics yet"
              message="Publish a video and refresh to see metrics."
            />
          )}
        </View>
      )}
    </Screen>
  );
}
