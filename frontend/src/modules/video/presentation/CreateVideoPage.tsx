import { cn } from '@/shared/lib/cn';
import { Button, Card, Textarea } from '@/shared/ui';

import { DURATION_PRESETS, useCreateVideoViewModel } from '../viewmodels/useCreateVideoViewModel';

export function CreateVideoPage() {
  const vm = useCreateVideoViewModel();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Create a video</h1>
      <p className="mt-1 text-content-secondary">
        Describe what you want, pick a length, and we&apos;ll generate it.
      </p>

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

          {vm.formError && <p className="text-sm text-danger">{vm.formError}</p>}

          <Button type="submit" size="lg" disabled={vm.isSubmitting}>
            {vm.isSubmitting ? 'Submitting…' : 'Generate video'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
