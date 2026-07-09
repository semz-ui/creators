import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { BalanceChip } from '@/modules/billing/presentation/BalanceChip';
import { Button, Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

export function HomeScreen() {
  const router = useRouter();
  const { user } = useSession();
  const videos = useVideoLibrary(1, 6);

  return (
    <Screen
      title="Home"
      headerRight={<BalanceChip />}
      refreshing={videos.isRefetching}
      onRefresh={() => void videos.refetch()}
    >
      <Card className="mb-6 gap-3 bg-inverse">
        <Text className="font-sans text-xs uppercase text-content-muted">Welcome</Text>
        <Text className="font-display text-xl text-content-inverse">{user?.email}</Text>
        <Button
          title="Create video"
          onPress={() => router.push('/(app)/(tabs)/create')}
          className="self-start"
          size="sm"
        />
      </Card>

      <Text className="mb-3 font-display text-lg text-content">Recent videos</Text>

      {videos.isPending ? (
        <Spinner />
      ) : videos.isError ? (
        <EmptyState title="Couldn't load your videos" message="Pull to refresh to try again." />
      ) : videos.data.items.length === 0 ? (
        <EmptyState
          title="No videos yet"
          message="Describe what you want and we'll generate it."
          actionLabel="Create a video"
          onAction={() => router.push('/(app)/(tabs)/create')}
        />
      ) : (
        <View>
          {videos.data.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      )}
    </Screen>
  );
}
