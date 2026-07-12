import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Button, Card, Field, Screen } from '@/shared/ui';

import { MUSIC_TRACKS, NARRATION_MAX, VOICES } from '../data/video.types';
import { DURATION_PRESETS, useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';
import { useUploadVideoViewModel } from '../viewmodels/useUploadVideoViewModel';

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

type Tab = 'generate' | 'upload';

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-1 items-center rounded-lg py-2',
        active ? 'bg-surface' : 'bg-transparent',
      )}
    >
      <Text
        className={cn(
          'font-sans-medium text-sm',
          active ? 'text-content' : 'text-content-secondary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function GeneratePanel() {
  const router = useRouter();
  const createVideoViewModel = useCreateVideoViewModel();

  return (
    <Card className="gap-5">
      <Field
        label="Prompt"
        value={createVideoViewModel.prompt}
        onChangeText={createVideoViewModel.setPrompt}
        error={createVideoViewModel.promptError}
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
              selected={createVideoViewModel.durationSeconds === seconds}
              onPress={() => createVideoViewModel.setDurationSeconds(seconds)}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionLabel>Background music</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          <Chip
            label="None"
            selected={createVideoViewModel.musicTrackId === ''}
            onPress={() => createVideoViewModel.setMusicTrackId('')}
          />
          {MUSIC_TRACKS.map((track) => (
            <Chip
              key={track.id}
              label={track.label}
              selected={createVideoViewModel.musicTrackId === track.id}
              onPress={() => createVideoViewModel.setMusicTrackId(track.id)}
            />
          ))}
        </View>
      </View>

      <Field
        label="Narration (optional)"
        value={createVideoViewModel.narrationText}
        onChangeText={createVideoViewModel.setNarrationText}
        error={createVideoViewModel.narrationError}
        multiline
        numberOfLines={3}
        maxLength={NARRATION_MAX + 100}
        placeholder="What the voice-over should say…"
      />

      {createVideoViewModel.narrationText.trim().length > 0 ? (
        <View>
          <SectionLabel>Voice</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {VOICES.map((voice) => (
              <Chip
                key={voice}
                label={voice}
                selected={createVideoViewModel.narrationVoice === voice}
                onPress={() => createVideoViewModel.setNarrationVoice(voice)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {createVideoViewModel.formError ? (
        <Text className="font-sans text-sm text-danger">{createVideoViewModel.formError}</Text>
      ) : null}
      {createVideoViewModel.outOfCredits ? (
        <Button
          title="Top up credits"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(app)/billing')}
        />
      ) : null}

      <Button
        title="Generate video"
        onPress={createVideoViewModel.onSubmit}
        loading={createVideoViewModel.isSubmitting}
        block
      />
    </Card>
  );
}

function UploadPanel() {
  const uploadVideoViewModel = useUploadVideoViewModel();

  return (
    <Card className="gap-5">
      <Field
        label="Title"
        value={uploadVideoViewModel.title}
        onChangeText={uploadVideoViewModel.setTitle}
        error={uploadVideoViewModel.titleError}
        placeholder="My awesome video"
      />

      <View className="gap-1.5">
        <SectionLabel>Video file</SectionLabel>
        <Pressable
          onPress={uploadVideoViewModel.pickFile}
          className={cn(
            'items-center justify-center rounded-xl border-2 border-dashed px-4 py-8',
            uploadVideoViewModel.file
              ? 'border-success bg-success-bg'
              : 'border-line bg-sunken active:bg-surface',
          )}
        >
          {uploadVideoViewModel.file ? (
            <View className="items-center gap-1">
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <Text className="font-sans-medium text-sm text-content" numberOfLines={1}>
                {uploadVideoViewModel.file.fileName}
              </Text>
              <Text className="font-sans text-xs text-content-muted">
                {formatSize(uploadVideoViewModel.file.size)}
              </Text>
              <Pressable onPress={uploadVideoViewModel.clearFile} className="mt-1">
                <Text className="font-sans text-xs text-brand">Change file</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center gap-1">
              <Ionicons name="cloud-upload-outline" size={28} color="#94a3b8" />
              <Text className="font-sans text-sm text-content-secondary">
                Tap to select a video
              </Text>
              <Text className="font-sans text-xs text-content-muted">
                MP4, MOV, or WebM up to 500 MB
              </Text>
            </View>
          )}
        </Pressable>
        {uploadVideoViewModel.fileError ? (
          <Text className="font-sans text-sm text-danger">{uploadVideoViewModel.fileError}</Text>
        ) : null}
      </View>

      {uploadVideoViewModel.progress !== null ? (
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-sm text-content-secondary">Uploading…</Text>
            <Text className="font-sans text-xs text-content-muted">
              {uploadVideoViewModel.progress}%
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-sunken">
            <View
              className="h-full rounded-full bg-brand"
              style={{ width: `${uploadVideoViewModel.progress}%` }}
            />
          </View>
        </View>
      ) : null}

      {uploadVideoViewModel.formError ? (
        <Text className="font-sans text-sm text-danger">{uploadVideoViewModel.formError}</Text>
      ) : null}

      <Button
        title={uploadVideoViewModel.isUploading ? 'Uploading…' : 'Upload video'}
        onPress={uploadVideoViewModel.onSubmit}
        loading={uploadVideoViewModel.isUploading}
        disabled={uploadVideoViewModel.isUploading || !uploadVideoViewModel.file}
        block
      />
    </Card>
  );
}

export function CreateVideoScreen() {
  const [tab, setTab] = useState<Tab>('generate');

  return (
    <Screen title="Add a video">
      <View className="mb-4 flex-row gap-1 rounded-xl bg-sunken p-1">
        <TabButton
          label="Generate"
          active={tab === 'generate'}
          onPress={() => setTab('generate')}
        />
        <TabButton label="Upload" active={tab === 'upload'} onPress={() => setTab('upload')} />
      </View>

      {tab === 'generate' ? <GeneratePanel /> : <UploadPanel />}
    </Screen>
  );
}
