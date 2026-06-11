import { Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** No-data card with an optional call to action. */
export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="items-center gap-3 py-10">
      <Text className="font-display text-lg text-content">{title}</Text>
      {message ? (
        <Text className="text-center font-sans text-sm text-content-secondary">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-2">
          <Button title={actionLabel} onPress={onAction} size="sm" />
        </View>
      ) : null}
    </Card>
  );
}
