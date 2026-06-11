import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from '../data/video.api';
import { NARRATION_MAX, type Voice } from '../data/video.types';
import { videoKeys } from '../data/query-keys';

export const DURATION_PRESETS = [15, 30, 45, 60] as const;
const PROMPT_MAX = 1000;

/** View-model for the create-video form. */
export function useCreateVideoViewModel() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(15);
  const [promptError, setPromptError] = useState<string | undefined>();

  // Optional audio.
  const [musicTrackId, setMusicTrackId] = useState<string>(''); // '' = none
  const [narrationText, setNarrationText] = useState('');
  const [narrationVoice, setNarrationVoice] = useState<Voice>('alloy');
  const [narrationError, setNarrationError] = useState<string | undefined>();

  const reset = () => {
    setPrompt('');
    setDurationSeconds(15);
    setMusicTrackId('');
    setNarrationText('');
    setNarrationVoice('alloy');
    setPromptError(undefined);
    setNarrationError(undefined);
  };

  const mutation = useMutation({
    mutationFn: videoApi.create,
    onSuccess: (video) => {
      void queryClient.invalidateQueries({ queryKey: videoKeys.all });
      // The Create tab stays mounted after navigation — reset it for next time.
      reset();
      router.push(`/(app)/videos/${video.id}`);
    },
  });

  const onSubmit = () => {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      setPromptError('Describe the video you want to generate');
      return;
    }
    if (trimmed.length > PROMPT_MAX) {
      setPromptError(`Keep it under ${PROMPT_MAX} characters`);
      return;
    }
    setPromptError(undefined);

    const narration = narrationText.trim();
    if (narration.length > NARRATION_MAX) {
      setNarrationError(`Keep narration under ${NARRATION_MAX} characters`);
      return;
    }
    setNarrationError(undefined);

    mutation.mutate({
      prompt: trimmed,
      durationSeconds,
      musicTrackId: musicTrackId || null,
      narrationText: narration || null,
      narrationVoice: narration ? narrationVoice : null,
    });
  };

  return {
    prompt,
    setPrompt,
    durationSeconds,
    setDurationSeconds,
    promptError,
    musicTrackId,
    setMusicTrackId,
    narrationText,
    setNarrationText,
    narrationVoice,
    setNarrationVoice,
    narrationError,
    isSubmitting: mutation.isPending,
    formError: toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 402) return "You're out of credits. Top up to generate more videos.";
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
