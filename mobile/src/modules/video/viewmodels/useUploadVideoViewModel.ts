import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../data/video.types';

const TITLE_MAX = 200;

export interface PickedFile {
  uri: string;
  mimeType: string;
  fileName: string;
  size: number;
}

export function useUploadVideoViewModel() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);

  const reset = () => {
    setTitle('');
    setFile(null);
    setTitleError(undefined);
    setFileError(undefined);
    setProgress(null);
  };

  const mutation = useMutation({
    mutationFn: (input: { title: string; uri: string; mimeType: string; fileName: string }) =>
      videoApi.upload(input, (pct) => setProgress(pct)),
    onSuccess: (video) => {
      void queryClient.invalidateQueries({ queryKey: videoKeys.all });
      reset();
      router.push(`/(app)/videos/${video.id}`);
    },
    onSettled: () => setProgress(null),
  });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_VIDEO_TYPES,
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0]!;
    const size = asset.size ?? 0;

    if (size > MAX_UPLOAD_BYTES) {
      setFileError(`File must be under ${MAX_UPLOAD_MB} MB`);
      setFile(null);
      return;
    }

    setFileError(undefined);
    setFile({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'video/mp4',
      fileName: asset.name,
      size,
    });
  };

  const clearFile = () => {
    setFile(null);
    setFileError(undefined);
  };

  const onSubmit = () => {
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

    mutation.mutate({
      title: trimmed,
      uri: file.uri,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
  };

  return {
    title,
    setTitle,
    titleError,
    file,
    pickFile,
    clearFile,
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
