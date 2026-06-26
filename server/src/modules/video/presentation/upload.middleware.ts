import type { NextFunction, Request, Response } from 'express';
import Busboy from 'busboy';

import { TooManyRequestsError, ValidationError } from '@shared/domain/errors';

import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../domain/upload-constraints';
import { FileTooLargeError, UnsupportedFileTypeError } from '../domain/video.errors';

export interface UploadedFile {
  data: Buffer;
  contentType: string;
}

// Cap in-process concurrent uploads to bound peak memory usage (each upload can buffer up to
// MAX_UPLOAD_BYTES). A full streaming refactor (port accepting ReadableStream) would remove
// this constraint entirely; treat this as a safety net in the meantime.
const MAX_CONCURRENT_UPLOADS = 5;
let activeUploads = 0;

export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    next(new ValidationError('Expected multipart/form-data'));
    return;
  }

  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    next(new TooManyRequestsError('Upload capacity reached, please retry shortly'));
    return;
  }
  activeUploads++;

  // Always decrement the counter, whether we succeed or fail.
  const release = (): void => {
    activeUploads--;
  };

  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

  const chunks: Buffer[] = [];
  let fileMime = '';
  let fileReceived = false;
  let truncated = false;
  let errored = false;
  let title = '';

  busboy.on('field', (name: string, value: string) => {
    if (name === 'title') {
      title = value;
    }
  });

  busboy.on('file', (_name: string, stream: NodeJS.ReadableStream, info: { mimeType: string }) => {
    fileMime = info.mimeType;

    if (!ALLOWED_MIME_TYPES.has(fileMime)) {
      errored = true;
      stream.resume();
      release();
      next(new UnsupportedFileTypeError(fileMime));
      return;
    }

    fileReceived = true;

    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on('limit', () => {
      truncated = true;
    });
  });

  busboy.on('close', () => {
    if (errored) return;

    if (truncated) {
      release();
      next(new FileTooLargeError(MAX_UPLOAD_MB));
      return;
    }

    if (!fileReceived) {
      release();
      next(new ValidationError('No video file provided'));
      return;
    }

    res.locals.uploadedFile = {
      data: Buffer.concat(chunks),
      contentType: fileMime,
    } as UploadedFile;
    res.locals.uploadTitle = title;
    release();
    next();
  });

  busboy.on('error', (err: Error) => {
    if (!errored) {
      errored = true;
      release();
      next(err);
    }
  });

  req.pipe(busboy);
}
