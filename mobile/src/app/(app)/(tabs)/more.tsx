import { useRouter } from 'expo-router';

import { MoreScreen } from '@/modules/auth/presentation/MoreScreen';

export default function MoreTab() {
  const router = useRouter();
  return (
    <MoreScreen
      items={[
        {
          icon: 'link-outline',
          label: 'Connections',
          onPress: () => router.push('/(app)/connections'),
        },
        {
          icon: 'card-outline',
          label: 'Billing',
          onPress: () => router.push('/(app)/billing'),
        },
        {
          icon: 'stats-chart-outline',
          label: 'Analytics',
          onPress: () => router.push('/(app)/analytics'),
        },
      ]}
    />
  );
}
