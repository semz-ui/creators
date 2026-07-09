import { v2 as cloudinary } from 'cloudinary';

import { CloudinaryVideoStorage } from '@modules/video/infrastructure/cloudinary-video-storage';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn() },
  },
}));

const uploadStream = cloudinary.uploader.upload_stream as unknown as jest.Mock;
const config = cloudinary.config as unknown as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('CloudinaryVideoStorage', () => {
  it('configures the SDK from the DSN', () => {
    new CloudinaryVideoStorage('cloudinary://key123:secret456@mycloud');
    expect(config).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key: 'key123',
        api_secret: 'secret456',
        cloud_name: 'mycloud',
        secure: true,
      }),
    );
  });

  it('rejects a malformed DSN', () => {
    expect(() => new CloudinaryVideoStorage('not-a-dsn')).toThrow(/CLOUDINARY_URL/);
  });

  it('uploads the buffer as a video and returns the secure url', async () => {
    uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => ({
      end: (_buf: Buffer) => cb(null, { secure_url: 'https://res.cloudinary.com/reelo/vid1.mp4' }),
    }));
    const storage = new CloudinaryVideoStorage('cloudinary://k:s@cloud');

    const url = await storage.upload(Buffer.from([1, 2, 3]), 'vid1', 'video/mp4');

    expect(url).toBe('https://res.cloudinary.com/reelo/vid1.mp4');
    expect(uploadStream).toHaveBeenCalledWith(
      { resource_type: 'video', public_id: 'vid1', folder: 'reelo', overwrite: true },
      expect.any(Function),
    );
  });

  it('rejects when Cloudinary returns an error', async () => {
    uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => ({
      end: () => cb(new Error('upload failed'), undefined),
    }));
    const storage = new CloudinaryVideoStorage('cloudinary://k:s@cloud');

    await expect(storage.upload(Buffer.from([1]), 'vid1', 'video/mp4')).rejects.toThrow(
      'upload failed',
    );
  });

  describe('uploadWithMetadata', () => {
    it('returns url and rounded duration', async () => {
      uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => ({
        end: (_buf: Buffer) =>
          cb(null, { secure_url: 'https://res.cloudinary.com/reelo/v.mp4', duration: 12.7 }),
      }));
      const storage = new CloudinaryVideoStorage('cloudinary://k:s@cloud');

      const result = await storage.uploadWithMetadata(Buffer.from([1, 2, 3]), 'v1', 'video/mp4');

      expect(result).toEqual({
        url: 'https://res.cloudinary.com/reelo/v.mp4',
        durationSeconds: 13,
      });
    });

    it('rejects when Cloudinary omits duration', async () => {
      uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => ({
        end: (_buf: Buffer) =>
          cb(null, { secure_url: 'https://res.cloudinary.com/reelo/v.mp4', duration: undefined }),
      }));
      const storage = new CloudinaryVideoStorage('cloudinary://k:s@cloud');

      await expect(storage.uploadWithMetadata(Buffer.from([1]), 'v1', 'video/mp4')).rejects.toThrow(
        /missing or invalid duration/,
      );
    });

    it('rejects when Cloudinary returns a negative duration', async () => {
      uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => ({
        end: (_buf: Buffer) =>
          cb(null, { secure_url: 'https://res.cloudinary.com/reelo/v.mp4', duration: -1 }),
      }));
      const storage = new CloudinaryVideoStorage('cloudinary://k:s@cloud');

      await expect(storage.uploadWithMetadata(Buffer.from([1]), 'v1', 'video/mp4')).rejects.toThrow(
        /missing or invalid duration/,
      );
    });
  });
});
