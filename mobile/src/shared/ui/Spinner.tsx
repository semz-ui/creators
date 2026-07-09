import { ActivityIndicator, View } from 'react-native';

/** Centered loading indicator in the brand color. */
export function Spinner({ flex = false }: { flex?: boolean }) {
  return (
    <View className={flex ? 'flex-1 items-center justify-center py-12' : 'items-center py-12'}>
      <ActivityIndicator size="large" color="#0284c7" />
    </View>
  );
}
