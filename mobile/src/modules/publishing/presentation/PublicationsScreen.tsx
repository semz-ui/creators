import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PLATFORMS } from '@/modules/connections/data/connections.types';
import { Button, EmptyState, Screen, Spinner } from '@/shared/ui';

import type { Publication } from '../data/publishing.types';
import { usePublications } from '../viewmodels/usePublications';
import { PublicationStatusBadge } from './PublicationBadges';

const PAGE_SIZE = 12;

const platformLabel = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

function PublicationCard({ publication }: { publication: Publication }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(app)/publications/${publication.id}`)}
      className="mb-3 gap-2 rounded-2xl border border-line-subtle bg-surface p-4 active:bg-sunken"
    >
      <Text numberOfLines={1} className="font-sans-semibold text-base text-content">
        {publication.caption ?? 'Untitled'}
      </Text>
      <Text className="font-sans text-xs text-content-muted">
        {publication.targets.map((target) => platformLabel(target.platform)).join(', ')}
      </Text>
      <PublicationStatusBadge status={publication.status} />
    </Pressable>
  );
}

export function PublicationsScreen() {
  const [page, setPage] = useState(1);
  const publications = usePublications(page, PAGE_SIZE);
  const router = useRouter();

  const totalPages = publications.data
    ? Math.max(1, Math.ceil(publications.data.total / PAGE_SIZE))
    : 1;

  return (
    <Screen
      title="Publications"
      subtitle="Where your videos have been shared"
      refreshing={publications.isRefetching}
      onRefresh={() => void publications.refetch()}
    >
      {publications.isPending ? (
        <Spinner />
      ) : publications.isError ? (
        <EmptyState
          title="Couldn't load your publications"
          message="Pull to refresh to try again."
        />
      ) : publications.data.items.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          message="Generate a video, then share it to your connected accounts."
          actionLabel="Go to Library"
          onAction={() => router.push('/(app)/(tabs)/library')}
        />
      ) : (
        <>
          {publications.data.items.map((publication) => (
            <PublicationCard key={publication.id} publication={publication} />
          ))}
          {totalPages > 1 ? (
            <View className="mt-3 flex-row items-center justify-between">
              <Button
                title="Previous"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text className="font-sans text-sm text-content-secondary">
                Page {page} of {totalPages}
              </Text>
              <Button
                title="Next"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
