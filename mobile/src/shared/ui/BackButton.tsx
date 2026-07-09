import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

/**
 * Inline back control for pushed screens (the app hides native headers).
 * Falls back to Home when there is no history (e.g. a deep link).
 */
export function BackButton() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/home');
    }
  };

  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="-mt-2 mb-4 flex-row items-center gap-1 self-start"
    >
      <Ionicons name="chevron-back" size={16} color="#0284c7" />
      <Text className="font-sans-medium text-sm text-content-brand">Back</Text>
    </Pressable>
  );
}
