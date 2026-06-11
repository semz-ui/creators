import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PLATFORMS } from '@/modules/connections/data/connections.types';
import { formatDateTime } from '@/shared/lib/format';
import { Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { usePublication } from '../viewmodels/usePublication';
import { PublicationStatusBadge, TargetStatusBadge } from './PublicationBadges';

const platformLabel = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function PublicationDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const publication = usePublication(id);

  return (
    <Screen title="Publication">
      <Pressable
        onPress={() => router.back()}
        className="-mt-2 mb-4 flex-row items-center gap-1 self-start"
      >
        <Ionicons name="chevron-back" size={16} color="#0284c7" />
        <Text className="font-sans-medium text-sm text-content-brand">Back</Text>
      </Pressable>

      {publication.isPending ? (
        <Spinner />
      ) : publication.isError ? (
        <EmptyState
          title="Couldn't load this publication"
          message="Pull to refresh to try again."
        />
      ) : (
        <View className="gap-4">
          <PublicationStatusBadge status={publication.data.status} />

          <Card className="gap-2">
            <Text className="font-sans-semibold text-base text-content">
              {publication.data.caption ?? 'Untitled'}
            </Text>
            {publication.data.scheduledAt ? (
              <Text className="font-sans text-xs text-content-muted">
                Scheduled for {formatDateTime(publication.data.scheduledAt)}
              </Text>
            ) : null}
          </Card>

          <Card className="p-0">
            {publication.data.targets.map((target, index) => (
              <View
                key={target.platform}
                className={`gap-2 px-5 py-4 ${
                  index < publication.data.targets.length - 1 ? 'border-b border-line-subtle' : ''
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-medium text-base text-content">
                    {platformLabel(target.platform)}
                  </Text>
                  <TargetStatusBadge status={target.status} />
                </View>
                {target.error ? (
                  <Text className="font-sans text-xs text-danger">{target.error}</Text>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
