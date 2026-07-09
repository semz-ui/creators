import { useLocalSearchParams } from 'expo-router';

import { VideoDetailScreen } from '@/modules/video/presentation/VideoDetailScreen';

export default function VideoDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VideoDetailScreen id={String(id)} />;
}
