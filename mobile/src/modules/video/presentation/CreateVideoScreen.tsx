import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Button, Card, Field, Screen } from '@/shared/ui';

import { MUSIC_TRACKS, NARRATION_MAX, VOICES } from '../data/video.types';
import { DURATION_PRESETS, useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';

function Chip({
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
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-2 font-sans-medium text-sm text-content-secondary">{children}</Text>;
}

export function CreateVideoScreen() {
  const vm = useCreateVideoViewModel();

  return (
    <Screen title="Create" subtitle="Describe it. We'll generate it.">
      <Card className="gap-5">
        <Field
          label="Prompt"
          value={vm.prompt}
          onChangeText={vm.setPrompt}
          error={vm.promptError}
          multiline
          numberOfLines={5}
          placeholder="A neon-lit city timelapse at night, cinematic, rain on the streets…"
        />

        <View>
          <SectionLabel>Duration</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {DURATION_PRESETS.map((seconds) => (
              <Chip
                key={seconds}
                label={`${seconds}s`}
                selected={vm.durationSeconds === seconds}
                onPress={() => vm.setDurationSeconds(seconds)}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>Background music</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="None"
              selected={vm.musicTrackId === ''}
              onPress={() => vm.setMusicTrackId('')}
            />
            {MUSIC_TRACKS.map((track) => (
              <Chip
                key={track.id}
                label={track.label}
                selected={vm.musicTrackId === track.id}
                onPress={() => vm.setMusicTrackId(track.id)}
              />
            ))}
          </View>
        </View>

        <Field
          label="Narration (optional)"
          value={vm.narrationText}
          onChangeText={vm.setNarrationText}
          error={vm.narrationError}
          multiline
          numberOfLines={3}
          maxLength={NARRATION_MAX + 100}
          placeholder="What the voice-over should say…"
        />

        {vm.narrationText.trim().length > 0 ? (
          <View>
            <SectionLabel>Voice</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {VOICES.map((voice) => (
                <Chip
                  key={voice}
                  label={voice}
                  selected={vm.narrationVoice === voice}
                  onPress={() => vm.setNarrationVoice(voice)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {vm.formError ? (
          <Text className="font-sans text-sm text-danger">{vm.formError}</Text>
        ) : null}

        <Button title="Generate video" onPress={vm.onSubmit} loading={vm.isSubmitting} block />
      </Card>
    </Screen>
  );
}
