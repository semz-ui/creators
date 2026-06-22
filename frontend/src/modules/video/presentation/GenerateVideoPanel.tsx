import { cn } from '@/shared/lib/cn';
import { Button, Card, Textarea } from '@/shared/ui';

import { MUSIC_TRACKS, VOICES, type Voice } from '../data/video.types';
import { DURATION_PRESETS, useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';

const SELECT_CLASS =
  'h-10 rounded-lg border border-line bg-surface px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export function GenerateVideoPanel() {
  const vm = useCreateVideoViewModel();

  return (
    <Card className="mt-6">
      <form className="flex flex-col gap-5" onSubmit={vm.onSubmit} noValidate>
        <Textarea
          label="Prompt"
          placeholder="A neon city skyline at night, cinematic drone shot…"
          value={vm.prompt}
          onChange={(e) => vm.setPrompt(e.target.value)}
          error={vm.promptError}
          rows={5}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-content-secondary">Duration</span>
          <div className="flex gap-2" role="group" aria-label="Duration">
            {DURATION_PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                aria-pressed={vm.durationSeconds === seconds}
                onClick={() => vm.setDurationSeconds(seconds)}
                className={cn(
                  'h-10 flex-1 rounded-lg border text-sm font-medium transition-colors',
                  vm.durationSeconds === seconds
                    ? 'border-brand bg-brand text-content-inverse'
                    : 'border-line bg-surface text-content hover:bg-sunken',
                )}
              >
                {seconds}s
              </button>
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
            value={vm.musicTrackId}
            onChange={(e) => vm.setMusicTrackId(e.target.value)}
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
            value={vm.narrationText}
            onChange={(e) => vm.setNarrationText(e.target.value)}
            error={vm.narrationError}
            rows={3}
          />
          {vm.narrationText.trim() && (
            <div className="flex items-center gap-2">
              <label htmlFor="voice" className="text-sm text-content-secondary">
                Voice
              </label>
              <select
                id="voice"
                className={SELECT_CLASS}
                value={vm.narrationVoice}
                onChange={(e) => vm.setNarrationVoice(e.target.value as Voice)}
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

        {vm.formError && <p className="text-sm text-danger">{vm.formError}</p>}

        <Button type="submit" size="lg" disabled={vm.isSubmitting}>
          {vm.isSubmitting ? 'Submitting…' : 'Generate video'}
        </Button>
      </form>
    </Card>
  );
}
