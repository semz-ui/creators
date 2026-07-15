import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';
import { Button, Card, Textarea } from '@/shared/ui';

import { MUSIC_TRACKS, VOICES, type Voice } from '../viewmodels/video.constants';
import { DURATION_PRESETS, useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';

const SELECT_CLASS =
  'h-10 rounded-lg border border-line bg-surface-raised px-3 text-sm text-content transition-all focus-visible:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/50';

export function GenerateVideoPanel() {
  const createVideoViewModel = useCreateVideoViewModel();

  return (
    <Card className="mt-6">
      <form className="flex flex-col gap-5" onSubmit={createVideoViewModel.onSubmit} noValidate>
        <Textarea
          label="Prompt"
          placeholder="A neon city skyline at night, cinematic drone shot…"
          value={createVideoViewModel.prompt}
          onChange={(e) => createVideoViewModel.setPrompt(e.target.value)}
          error={createVideoViewModel.promptError}
          rows={5}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-content-secondary">Duration</span>
          <div className="flex gap-2" role="group" aria-label="Duration">
            {DURATION_PRESETS.map((seconds) => (
              <motion.button
                key={seconds}
                type="button"
                aria-pressed={createVideoViewModel.durationSeconds === seconds}
                onClick={() => createVideoViewModel.setDurationSeconds(seconds)}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  'h-10 flex-1 rounded-lg border text-sm font-medium transition-all duration-150',
                  createVideoViewModel.durationSeconds === seconds
                    ? 'border-brand/40 bg-gradient-brand text-white shadow-glow-sm'
                    : 'border-line bg-surface-raised text-content hover:border-brand/30 hover:bg-surface',
                )}
              >
                {seconds}s
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="music" className="text-sm font-medium text-content-secondary">
            Background music
          </label>
          <select
            id="music"
            className={SELECT_CLASS}
            value={createVideoViewModel.musicTrackId}
            onChange={(e) => createVideoViewModel.setMusicTrackId(e.target.value)}
          >
            <option value="">None</option>
            {MUSIC_TRACKS.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Textarea
            label="Narration (optional)"
            placeholder="Words to speak over the video…"
            value={createVideoViewModel.narrationText}
            onChange={(e) => createVideoViewModel.setNarrationText(e.target.value)}
            error={createVideoViewModel.narrationError}
            rows={3}
          />
          {createVideoViewModel.narrationText.trim() && (
            <div className="flex items-center gap-2">
              <label htmlFor="voice" className="text-sm text-content-secondary">
                Voice
              </label>
              <select
                id="voice"
                className={SELECT_CLASS}
                value={createVideoViewModel.narrationVoice}
                onChange={(e) => createVideoViewModel.setNarrationVoice(e.target.value as Voice)}
              >
                {VOICES.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {createVideoViewModel.formError && (
          <p className="text-sm text-danger">{createVideoViewModel.formError}</p>
        )}

        <Button type="submit" size="lg" disabled={createVideoViewModel.isSubmitting}>
          {createVideoViewModel.isSubmitting ? 'Submitting…' : 'Generate · 5 credits'}
        </Button>
      </form>
    </Card>
  );
}
