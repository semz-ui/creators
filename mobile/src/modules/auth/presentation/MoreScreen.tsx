import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, Text, View } from 'react-native';

import { Card, Screen } from '@/shared/ui';

import { useSession } from '../viewmodels/useSession';

interface MoreItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

/**
 * The "More" tab: account info + links to the secondary sections. Rows are
 * enabled as their features land (connections, billing, analytics).
 */
export function MoreScreen({ items = [] }: { items?: MoreItem[] }) {
  const { user, logout } = useSession();

  const confirmLogout = () => {
    Alert.alert('Log out', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <Screen title="More">
      <Card className="mb-4 gap-1">
        <Text className="font-sans text-xs uppercase text-content-muted">Signed in as</Text>
        <Text className="font-sans-semibold text-base text-content">{user?.email ?? '—'}</Text>
      </Card>

      {items.length > 0 ? (
        <Card className="mb-4 p-0">
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center gap-3 px-5 py-4 active:bg-sunken ${
                index < items.length - 1 ? 'border-b border-line-subtle' : ''
              }`}
            >
              <Ionicons name={item.icon} size={20} color="#0284c7" />
              <Text className="flex-1 font-sans-medium text-base text-content">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Pressable
        onPress={confirmLogout}
        className="flex-row items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 active:bg-sunken"
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text className="font-sans-semibold text-base text-danger">Log out</Text>
      </Pressable>

      <View className="mt-6 items-center">
        <Text className="font-sans text-xs text-content-muted">
          Reelo — prompt to published, automatically.
        </Text>
      </View>
    </Screen>
  );
}
