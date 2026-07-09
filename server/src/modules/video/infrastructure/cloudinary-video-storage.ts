import { v2 as cloudinary } from 'cloudinary';

import type { IVideoStorage, UploadResult } from '../domain/ports/video-storage';

/**
 * Cloudinary-backed {@link IVideoStorage}. Uploads the MP4 bytes and returns the
 * secure CDN URL. `public_id = key` (the generator job ref) makes re-uploads
 * idempotent, so concurrent poll-on-read passes can't create duplicate assets.
 */
export class CloudinaryVideoStorage implements IVideoStorage {
  /** @param url the `cloudinary://key:secret@cloud` DSN. */
  constructor(url: string) {
    // The v2 SDK parses the DSN; force https URLs in the result.
    cloudinary.config({ ...parseCloudinaryUrl(url), secure: true });
  }

  upload(data: Buffer, key: string, _contentType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', public_id: key, folder: 'reelo', overwrite: true },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary: empty upload result'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(data);
    });
  }

  uploadWithMetadata(data: Buffer, key: string, _contentType: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', public_id: key, folder: 'reelo', overwrite: true },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary: empty upload result'));
            return;
          }
          if (result.duration == null || result.duration < 0) {
            reject(new Error('Cloudinary: missing or invalid duration in upload result'));
            return;
          }
          resolve({
            url: result.secure_url,
            durationSeconds: Math.round(result.duration),
          });
        },
      );
      stream.end(data);
    });
  }
}

/** Parse a `cloudinary://<api_key>:<api_secret>@<cloud_name>` DSN. */
export function parseCloudinaryUrl(url: string): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
  if (!match) {
    throw new Error('Invalid CLOUDINARY_URL (expected cloudinary://key:secret@cloud_name)');
  }
  return {
    api_key: match[1] as string,
    api_secret: match[2] as string,
    cloud_name: match[3] as string,
  };
}
