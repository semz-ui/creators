import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, EmptyState, Screen, Spinner } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

const PAGE_SIZE = 12;

export function LibraryScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const videos = useVideoLibrary(page, PAGE_SIZE);

  const totalPages = videos.data ? Math.max(1, Math.ceil(videos.data.total / PAGE_SIZE)) : 1;

  return (
    <Screen
      title="Library"
      headerRight={
        <Button title="New video" size="sm" onPress={() => router.push('/(app)/(tabs)/create')} />
      }
      refreshing={videos.isRefetching}
      onRefresh={() => void videos.refetch()}
    >
      {videos.isPending ? (
        <Spinner />
      ) : videos.isError ? (
        <EmptyState title="Couldn't load your videos" message="Pull to refresh to try again." />
      ) : videos.data.items.length === 0 ? (
        <EmptyState
          title="No videos yet"
          message="Create your first video — generate with AI or upload your own."
          actionLabel="Add a video"
          onAction={() => router.push('/(app)/(tabs)/create')}
        />
      ) : (
        <>
          {videos.data.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
          {totalPages > 1 ? (
            <View className="mt-3 flex-row items-center justify-between">
              <Button
                title="Previous"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text className="font-sans text-sm text-content-secondary">
                Page {page} of {totalPages}
              </Text>
              <Button
                title="Next"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
