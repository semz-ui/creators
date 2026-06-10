/**
 * One-time helper: upload the built-in royalty-free music tracks to Cloudinary
 * so the audio compositor can overlay them. Drop an MP3 for each track id at
 * `server/scripts/music/<id>.mp3` (sources: e.g. Pixabay Music), then run:
 *
 *   cd server && npx tsx scripts/upload-music.ts
 *
 * Requires CLOUDINARY_URL in the environment (read from .env).
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { v2 as cloudinary } from 'cloudinary';

import { MUSIC_TRACKS } from '../src/modules/video/domain/audio';

async function main(): Promise<void> {
  const url = process.env.CLOUDINARY_URL;
  const match = url ? /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim()) : null;
  if (!match) {
    console.error('Set CLOUDINARY_URL (cloudinary://key:secret@cloud_name) before running.');
    process.exit(1);
  }
  cloudinary.config({
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3],
    secure: true,
  });

  const dir = join(__dirname, 'music');
  for (const track of MUSIC_TRACKS) {
    const file = join(dir, `${track.id}.mp3`);
    if (!existsSync(file)) {
      console.warn(`skip "${track.id}" — missing ${file}`);
      continue;
    }
    const res = await cloudinary.uploader.upload(file, {
      resource_type: 'video',
      public_id: track.publicId,
      overwrite: true,
    });
    console.log(`uploaded "${track.id}" -> ${res.secure_url}`);
  }
  console.log('Done.');
}

void main();
