import { useLocalSearchParams } from 'expo-router';

import { PublicationDetailScreen } from '@/modules/publishing/presentation/PublicationDetailScreen';

export default function PublicationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublicationDetailScreen id={String(id)} />;
}
