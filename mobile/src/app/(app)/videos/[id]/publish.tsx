import { useLocalSearchParams } from 'expo-router';

import { PublishScreen } from '@/modules/publishing/presentation/PublishScreen';

export default function PublishRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublishScreen videoId={String(id)} />;
}
