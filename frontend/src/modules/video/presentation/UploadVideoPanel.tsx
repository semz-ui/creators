import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState, type DragEvent } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button, Card, Input } from '@/shared/ui';

import { ALLOWED_VIDEO_TYPES } from '../data/video.types';
import { useUploadVideoViewModel } from '../viewmodels/useUploadVideoViewModel';

const ACCEPT = ALLOWED_VIDEO_TYPES.join(',');

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadVideoPanel() {
  const uploadVideoViewModel = useUploadVideoViewModel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) uploadVideoViewModel.onSelectFile(dropped);
    },
    [uploadVideoViewModel],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <Card className="mt-6">
      <form className="flex flex-col gap-5" onSubmit={uploadVideoViewModel.onSubmit} noValidate>
        <Input
          label="Title"
          placeholder="My awesome video"
          value={uploadVideoViewModel.title}
          onChange={(e) => uploadVideoViewModel.setTitle(e.target.value)}
          error={uploadVideoViewModel.titleError}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-content-secondary">Video file</span>
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            animate={
              dragOver
                ? { borderColor: '#22d3ee', boxShadow: '0 0 20px 0 rgba(34,211,238,0.2)' }
                : { borderColor: 'rgba(255,255,255,0.10)', boxShadow: '0 0 0px 0 transparent' }
            }
            transition={{ duration: 0.15 }}
            className={cn(
              'flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors',
              uploadVideoViewModel.file
                ? 'border-success/40 bg-success-bg'
                : 'border-line bg-sunken hover:border-line-strong',
            )}
          >
            {uploadVideoViewModel.file ? (
              <>
                <span className="font-medium text-content">{uploadVideoViewModel.file.name}</span>
                <span className="text-content-muted">
                  {formatSize(uploadVideoViewModel.file.size)}
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-content-muted" />
                <span className="text-content-secondary">
                  Drag and drop a video, or click to browse
                </span>
                <span className="text-content-muted">MP4, MOV, or WebM up to 500 MB</span>
              </>
            )}
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => uploadVideoViewModel.onSelectFile(e.target.files?.[0] ?? null)}
          />
          {uploadVideoViewModel.fileError && (
            <p className="text-sm text-danger">{uploadVideoViewModel.fileError}</p>
          )}
        </div>

        {uploadVideoViewModel.progress !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Uploading…</span>
              <span className="text-content-muted">{uploadVideoViewModel.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
              <motion.div
                className="h-full rounded-full bg-gradient-brand"
                animate={{ width: `${uploadVideoViewModel.progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {uploadVideoViewModel.formError && (
          <p className="text-sm text-danger">{uploadVideoViewModel.formError}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={uploadVideoViewModel.isUploading || !uploadVideoViewModel.file}
        >
          {uploadVideoViewModel.isUploading ? 'Uploading…' : 'Upload video'}
        </Button>
      </form>
    </Card>
  );
}
