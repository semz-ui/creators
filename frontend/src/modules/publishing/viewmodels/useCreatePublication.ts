import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Platform } from '@/modules/connections/data/connections.types';
import { HttpError } from '@/shared/data/http-error';

import { publishingApi } from '../data/publishing.api';
import { publicationKeys } from '../data/query-keys';
import type { CreatePublicationInput } from '../data/publishing.types';

export type ScheduleMode = 'now' | 'later';

/** View-model for the publish form (platform selection, caption, schedule). */
export function useCreatePublication(videoId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [caption, setCaption] = useState('');
  const [schedule, setSchedule] = useState<ScheduleMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const togglePlatform = (platform: Platform) =>
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );

  const mutation = useMutation({
    mutationFn: publishingApi.create,
    onSuccess: (publication) => {
      void queryClient.invalidateQueries({ queryKey: publicationKeys.all });
      navigate(`/publications/${publication.id}`);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (platforms.length === 0) {
      setValidationError('Pick at least one platform.');
      return;
    }

    let scheduledIso: string | undefined;
    if (schedule === 'later') {
      const when = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        setValidationError('Choose a date and time in the future.');
        return;
      }
      scheduledIso = when.toISOString();
    }

    setValidationError(undefined);
    const input: CreatePublicationInput = { videoId, platforms };
    if (caption.trim()) input.caption = caption.trim();
    if (scheduledIso) input.scheduledAt = scheduledIso;
    mutation.mutate(input);
  };

  return {
    platforms,
    togglePlatform,
    caption,
    setCaption,
    schedule,
    setSchedule,
    scheduledAt,
    setScheduledAt,
    isSubmitting: mutation.isPending,
    formError: validationError ?? toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) return error.message;
  return 'Something went wrong. Please try again.';
}
