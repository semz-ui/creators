import { useLocalSearchParams } from 'expo-router';

import { VideoAnalyticsScreen } from '@/modules/analytics/presentation/VideoAnalyticsScreen';

export default function VideoAnalyticsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VideoAnalyticsScreen videoId={String(id)} />;
}
