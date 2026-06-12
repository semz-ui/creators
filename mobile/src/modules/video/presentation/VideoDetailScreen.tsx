import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { isVideoProcessing, type Video } from '../data/video.types';
import { useVideo } from '../viewmodels/useVideo';
import { StatusBadge } from './StatusBadge';

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <View className="overflow-hidden rounded-2xl bg-inverse">
      <VideoView
        player={player}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        fullscreenOptions={{ enable: true }}
        nativeControls
      />
    </View>
  );
}

function ReadyVideo({ video }: { video: Video }) {
  const router = useRouter();
  return (
    <View className="gap-4">
      {video.resultUrl ? <VideoPlayer url={video.resultUrl} /> : null}
      <Card className="gap-3">
        <Text className="font-sans text-sm text-content-secondary">{video.prompt}</Text>
        <Text className="font-sans text-xs text-content-muted">
          {video.durationSeconds}s • created {new Date(video.createdAt).toLocaleDateString()}
        </Text>
        <Button
          title="Publish"
          onPress={() => router.push(`/(app)/videos/${video.id}/publish`)}
          block
        />
        <Button
          title="Analytics"
          variant="secondary"
          onPress={() => router.push(`/(app)/videos/${video.id}/analytics`)}
          block
        />
      </Card>
    </View>
  );
}

export function VideoDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const video = useVideo(id);

  return (
    <Screen scroll title="Video" showBack>
      {video.isPending ? (
        <Spinner />
      ) : video.isError ? (
        <EmptyState title="Couldn't load this video" message="Pull to refresh to try again." />
      ) : (
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <StatusBadge status={video.data.status} />
          </View>

          {video.data.status === 'ready' ? (
            <ReadyVideo video={video.data} />
          ) : video.data.status === 'failed' ? (
            <Card className="items-center gap-3 py-8">
              <Ionicons name="alert-circle" size={32} color="#ef4444" />
              <Text className="font-display text-lg text-content">Generation failed</Text>
              <Text className="text-center font-sans text-sm text-content-secondary">
                {video.data.error ?? 'Something went wrong.'}
              </Text>
              <Button
                title="Try again"
                size="sm"
                onPress={() => router.push('/(app)/(tabs)/create')}
              />
            </Card>
          ) : isVideoProcessing(video.data.status) ? (
            <Card className="items-center gap-3 py-10">
              <Spinner />
              <Text className="font-display text-lg text-content">Generating your video…</Text>
              <Text className="text-center font-sans text-sm text-content-secondary">
                This usually takes a moment. We&apos;ll update automatically.
              </Text>
              <Text className="text-center font-sans text-xs text-content-muted" numberOfLines={3}>
                {video.data.prompt}
              </Text>
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
