import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../data/video.types';

const TITLE_MAX = 200;

export function useUploadVideoViewModel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { title: string; file: File }) =>
      videoApi.upload(input, (pct) => setProgress(pct)),
    onSuccess: (video) => {
      void queryClient.invalidateQueries({ queryKey: videoKeys.all });
      navigate(`/videos/${video.id}`);
    },
    onSettled: () => setProgress(null),
  });

  const onSelectFile = (f: File | null) => {
    setFileError(undefined);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setFileError(`File must be under ${MAX_UPLOAD_MB} MB`);
      return;
    }
    if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
      setFileError('Only MP4, MOV, and WebM files are accepted');
      return;
    }
    setFile(f);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setTitleError('Give your video a title');
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setTitleError(`Keep it under ${TITLE_MAX} characters`);
      return;
    }
    setTitleError(undefined);

    if (!file) {
      setFileError('Select a video file');
      return;
    }

    mutation.mutate({ title: trimmed, file });
  };

  return {
    title,
    setTitle,
    titleError,
    file,
    onSelectFile,
    fileError,
    progress,
    isUploading: mutation.isPending,
    formError: toFormError(mutation.error),
    onSubmit,
  };
}

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) return error.message;
  return 'Something went wrong. Please try again.';
}
