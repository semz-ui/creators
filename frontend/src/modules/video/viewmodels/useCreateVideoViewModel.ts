import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';

export const DURATION_PRESETS = [15, 30, 45, 60] as const;
const PROMPT_MAX = 1000;

/** View-model for the create-video form. */
export function useCreateVideoViewModel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(15);
  const [promptError, setPromptError] = useState<string | undefined>();

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
    mutation.mutate({ prompt: trimmed, durationSeconds });
  };

  return {
    prompt,
    setPrompt,
    durationSeconds,
    setDurationSeconds,
    promptError,
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
