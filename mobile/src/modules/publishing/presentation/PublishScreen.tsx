import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PLATFORMS } from '@/modules/connections/data/connections.types';
import { useConnections } from '@/modules/connections/viewmodels/useConnections';
import { useVideo } from '@/modules/video/viewmodels/useVideo';
import { cn } from '@/shared/lib/cn';
import { Button, Card, EmptyState, Field, Screen, Spinner } from '@/shared/ui';

import { useCreatePublication, type ScheduleMode } from '../viewmodels/useCreatePublication';
import { ScheduleField } from './ScheduleField';

function ModeOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-1 items-center rounded-xl border px-4 py-3',
        selected ? 'border-brand bg-brand' : 'border-line bg-surface active:bg-sunken',
      )}
    >
      <Text
        className={cn(
          'font-sans-medium text-sm',
          selected ? 'text-content-inverse' : 'text-content-secondary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PublishScreen({ videoId }: { videoId: string }) {
  const router = useRouter();
  const video = useVideo(videoId);
  const connections = useConnections();
  const createPublicationViewModel = useCreatePublication(videoId);

  if (video.isPending || connections.isPending) {
    return (
      <Screen title="Publish" showBack>
        <Spinner />
      </Screen>
    );
  }

  if (video.isError || !video.data || video.data.status !== 'ready') {
    return (
      <Screen title="Publish" showBack>
        <EmptyState
          title="This video isn't ready to publish"
          message="Wait for generation to finish, then try again."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const activePlatforms = new Set(
    (connections.data ?? [])
      .filter((connection) => connection.status === 'active')
      .map((connection) => connection.platform),
  );

  if (activePlatforms.size === 0) {
    return (
      <Screen title="Publish" subtitle="Share this video to your connected accounts" showBack>
        <EmptyState
          title="No connected accounts"
          message="Connect a platform first, then come back to publish."
          actionLabel="Go to Connections"
          onAction={() => router.push('/(app)/connections')}
        />
      </Screen>
    );
  }

  const modes: { id: ScheduleMode; label: string }[] = [
    { id: 'now', label: 'Publish now' },
    { id: 'later', label: 'Schedule' },
  ];

  return (
    <Screen title="Publish" subtitle="Share this video to your connected accounts" showBack>
      <Card className="gap-5">
        <View>
          <Text className="mb-2 font-sans-medium text-sm text-content-secondary">Platforms</Text>
          <View className="flex-row flex-wrap gap-2">
            {PLATFORMS.filter(({ id }) => activePlatforms.has(id)).map(({ id, label }) => {
              const selected = createPublicationViewModel.platforms.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => createPublicationViewModel.togglePlatform(id)}
                  className={cn(
                    'rounded-full border px-4 py-2',
                    selected ? 'border-brand bg-brand' : 'border-line bg-surface active:bg-sunken',
                  )}
                >
                  <Text
                    className={cn(
                      'font-sans-medium text-sm',
                      selected ? 'text-content-inverse' : 'text-content-secondary',
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field
          label="Caption (optional)"
          value={createPublicationViewModel.caption}
          onChangeText={createPublicationViewModel.setCaption}
          multiline
          numberOfLines={3}
          placeholder="Say something about this video…"
        />

        <View>
          <Text className="mb-2 font-sans-medium text-sm text-content-secondary">When</Text>
          <View className="flex-row gap-2">
            {modes.map(({ id, label }) => (
              <ModeOption
                key={id}
                label={label}
                selected={createPublicationViewModel.schedule === id}
                onPress={() => createPublicationViewModel.setSchedule(id)}
              />
            ))}
          </View>
          {createPublicationViewModel.schedule === 'later' ? (
            <View className="mt-3">
              <ScheduleField
                value={createPublicationViewModel.scheduledAt}
                onChange={createPublicationViewModel.setScheduledAt}
              />
            </View>
          ) : null}
        </View>

        {createPublicationViewModel.formError ? (
          <Text className="font-sans text-sm text-danger">
            {createPublicationViewModel.formError}
          </Text>
        ) : null}

        <Button
          title={createPublicationViewModel.schedule === 'later' ? 'Schedule' : 'Publish now'}
          onPress={createPublicationViewModel.onSubmit}
          loading={createPublicationViewModel.isSubmitting}
          block
        />
      </Card>
    </Screen>
  );
}
