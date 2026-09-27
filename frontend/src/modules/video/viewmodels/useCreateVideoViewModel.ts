import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from '../data/video.api';
import type { VideoProvider } from '../data/video.types';
import { NARRATION_MAX, type Voice } from './video.constants';
import { videoKeys } from '../data/query-keys';
import { useVideoProviders } from './useVideoProviders';

export const DURATION_PRESETS = [15, 30, 45, 60] as const;
const PROMPT_MAX = 1000;

/** View-model for the create-video form. */
export function useCreateVideoViewModel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(15);
  const [promptError, setPromptError] = useState<string | undefined>();

  // Generator selection. `null` until the providers query resolves; the first
  // available provider is then used, so the form never submits an unavailable
  // one (which the API would reject with a 422).
  const providersQuery = useVideoProviders();
  const providers = providersQuery.data ?? [];
  const [chosenProvider, setChosenProvider] = useState<VideoProvider | null>(null);
  const provider = chosenProvider ?? providers.find((candidate) => candidate.available)?.id ?? null;
  const supportsAudio = providers.find((entry) => entry.id === provider)?.supportsAudio ?? true;

  // Optional audio.
  const [musicTrackId, setMusicTrackId] = useState<string>(''); // '' = none
  const [narrationText, setNarrationText] = useState('');
  const [narrationVoice, setNarrationVoice] = useState<Voice>('alloy');
  const [narrationError, setNarrationError] = useState<string | undefined>();

  /**
   * Switching generators clears any audio the new one can't apply, so a control
   * that's disabled in the UI can never submit a stale value the server would
   * silently drop.
   */
  const selectProvider = (next: VideoProvider) => {
    setChosenProvider(next);
    const nextSupportsAudio = providers.find((entry) => entry.id === next)?.supportsAudio ?? true;
    if (!nextSupportsAudio) {
      setMusicTrackId('');
      setNarrationText('');
      setNarrationError(undefined);
    }
  };

  const mutation = useMutation({
    mutationFn: videoApi.create,
    onSuccess: (video) => {
      void queryClient.invalidateQueries({ queryKey: videoKeys.all });
      navigate(`/videos/${video.id}`);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
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
      provider,
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
    providers,
    provider,
    selectProvider,
    supportsAudio,
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
