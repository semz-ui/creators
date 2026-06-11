import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { Video } from '../data/video.types';
import { StatusBadge } from './StatusBadge';

export function VideoCard({ video }: { video: Video }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/(app)/videos/${video.id}`)}
      className="mb-3 flex-row items-center gap-4 rounded-2xl border border-line-subtle bg-surface p-4 active:bg-sunken"
    >
      <View className="h-14 w-14 items-center justify-center rounded-xl bg-inverse">
        <Ionicons name="play" size={20} color="#ffffff" />
      </View>
      <View className="flex-1 gap-1.5">
        <Text numberOfLines={2} className="font-sans-medium text-sm text-content">
          {video.prompt}
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusBadge status={video.status} />
          <Text className="font-sans text-xs text-content-muted">{video.durationSeconds}s</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );
}
