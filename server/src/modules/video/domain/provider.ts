import { UnsupportedProviderError } from './video.errors';

/**
 * The AI video generators this app can drive. `stub` is the credential-free
 * fallback that keeps the product working locally and in tests.
 */
export type VideoProvider = 'sora' | 'kling' | 'pika' | 'stub';

/**
 * Providers a user may choose from. `stub` is deliberately absent: it is the
 * unnamed fallback, not a product option.
 */
export const SELECTABLE_PROVIDERS = ['sora', 'kling', 'pika'] as const satisfies readonly [
  VideoProvider,
  ...VideoProvider[],
];

export const PROVIDER_LABELS: Record<VideoProvider, string> = {
  sora: 'Sora',
  kling: 'Kling',
  pika: 'Pika',
  stub: 'Demo',
};

/**
 * Whether music/narration can be mixed into a provider's output. Only true for
 * generators that land their result in our own storage — the audio compositor
 * works on a Cloudinary asset, so a generator returning someone else's hosted
 * URL (Kling, Pika) has nothing to composite onto.
 */
export const PROVIDER_SUPPORTS_AUDIO: Record<VideoProvider, boolean> = {
  sora: true,
  kling: false,
  pika: false,
  stub: false,
};

/** Narrow an arbitrary string to a user-selectable VideoProvider, or throw. */
export function parseVideoProvider(raw: string): VideoProvider {
  if ((SELECTABLE_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as VideoProvider;
  }
  throw new UnsupportedProviderError(raw);
}
