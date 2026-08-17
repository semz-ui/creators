import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

import type { VideoProvider, VideoProviderInfo } from '../data/video.types';

export interface ProviderPickerProps {
  providers: VideoProviderInfo[];
  value: VideoProvider | null;
  onChange: (provider: VideoProvider) => void;
}

/**
 * Generator picker. Each option carries a dot: green when the server has
 * credentials for that provider, red when it doesn't. Unavailable providers stay
 * visible — so it's clear what could be enabled — but can't be selected, which
 * matches the API rejecting them outright.
 */
export function ProviderPicker({ providers, value, onChange }: ProviderPickerProps) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content-secondary">Generator</span>
      <div className="flex gap-2" role="group" aria-label="Generator">
        {providers.map((provider) => {
          const selected = provider.id === value;
          return (
            <motion.button
              key={provider.id}
              type="button"
              disabled={!provider.available}
              aria-pressed={selected}
              title={
                provider.available
                  ? undefined
                  : `${provider.label} is not configured on this server`
              }
              onClick={() => onChange(provider.id)}
              {...(provider.available && { whileTap: { scale: 0.94 } })}
              transition={{ duration: 0.1 }}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all duration-150',
                !provider.available && 'cursor-not-allowed opacity-50',
                selected
                  ? 'border-brand/40 bg-gradient-brand text-white shadow-glow-sm'
                  : 'border-line bg-surface-raised text-content',
                provider.available && !selected && 'hover:border-brand/30 hover:bg-surface',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  provider.available ? 'bg-success' : 'bg-danger',
                )}
              />
              {provider.label}
              <span className="sr-only">
                {provider.available ? '(available)' : '(not configured)'}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
