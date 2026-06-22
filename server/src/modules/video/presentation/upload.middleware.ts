import type { NextFunction, Request, Response } from 'express';
import Busboy from 'busboy';

import { ValidationError } from '@shared/domain/errors';

import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../domain/upload-constraints';
import { FileTooLargeError, UnsupportedFileTypeError } from '../domain/video.errors';

export interface UploadedFile {
  data: Buffer;
  contentType: string;
}

export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    next(new ValidationError('Expected multipart/form-data'));
    return;
  }

  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

  const chunks: Buffer[] = [];
  let fileMime = '';
  let fileReceived = false;
  let truncated = false;
  let title = '';

  busboy.on('field', (name: string, value: string) => {
    if (name === 'title') {
      title = value;
    }
  });

  busboy.on('file', (_name: string, stream: NodeJS.ReadableStream, info: { mimeType: string }) => {
    fileMime = info.mimeType;

    if (!ALLOWED_MIME_TYPES.has(fileMime)) {
      stream.resume();
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
    if (truncated) {
      next(new FileTooLargeError(MAX_UPLOAD_MB));
      return;
    }

    if (!fileReceived) {
      next(new ValidationError('No video file provided'));
      return;
    }

    res.locals.uploadedFile = {
      data: Buffer.concat(chunks),
      contentType: fileMime,
    } as UploadedFile;
    res.locals.uploadTitle = title;
    next();
  });

  busboy.on('error', (err: Error) => {
    next(err);
  });

  req.pipe(busboy);
}
