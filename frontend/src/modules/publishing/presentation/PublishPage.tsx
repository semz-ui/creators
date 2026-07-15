import { Link, useParams } from 'react-router-dom';

import type { Platform } from '@/modules/connections/data/connections.types';
import { PLATFORMS } from '@/modules/connections/viewmodels/platform.constants';
import { useConnections } from '@/modules/connections/viewmodels/useConnections';
import { useVideo } from '@/modules/video/viewmodels/useVideo';
import { cn } from '@/shared/lib/cn';
import { Button, Card, Spinner, Textarea } from '@/shared/ui';

import { useCreatePublication } from '../viewmodels/useCreatePublication';

const LABEL: Record<Platform, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
) as Record<Platform, string>;

export function PublishPage() {
  const { id = '' } = useParams();
  const { data: video, isPending: videoPending } = useVideo(id);
  const { data: connections, isPending: connectionsPending } = useConnections();
  const createPublicationViewModel = useCreatePublication(id);

  if (videoPending || connectionsPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!video || video.status !== 'ready') {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-content-secondary">This video isn&apos;t ready to publish yet.</p>
        <Link to={`/videos/${id}`} className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Back to the video
        </Link>
      </Card>
    );
  }

  const connectedPlatforms = (connections ?? [])
    .filter((c) => c.status === 'active')
    .map((c) => c.platform);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Publish</h1>
      <p className="mt-1 text-content-secondary">Share this video to your connected accounts.</p>

      {connectedPlatforms.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-content-secondary">You haven&apos;t connected any accounts yet.</p>
          <Link to="/connections" className="mt-2 inline-block text-sm text-brand hover:underline">
            Connect an account →
          </Link>
        </Card>
      ) : (
        <Card className="mt-6">
          <form
            className="flex flex-col gap-5"
            onSubmit={createPublicationViewModel.onSubmit}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-content-secondary">Platforms</span>
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={createPublicationViewModel.platforms.includes(platform)}
                    onClick={() => createPublicationViewModel.togglePlatform(platform)}
                    className={cn(
                      'h-10 rounded-lg border px-4 text-sm font-medium transition-colors',
                      createPublicationViewModel.platforms.includes(platform)
                        ? 'border-brand bg-brand text-content-inverse'
                        : 'border-line bg-surface text-content hover:bg-sunken',
                    )}
                  >
                    {LABEL[platform]}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Caption (optional)"
              value={createPublicationViewModel.caption}
              onChange={(e) => createPublicationViewModel.setCaption(e.target.value)}
              rows={3}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-content-secondary">When</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-content">
                  <input
                    type="radio"
                    name="schedule"
                    checked={createPublicationViewModel.schedule === 'now'}
                    onChange={() => createPublicationViewModel.setSchedule('now')}
                  />
                  Publish now
                </label>
                <label className="flex items-center gap-2 text-sm text-content">
                  <input
                    type="radio"
                    name="schedule"
                    checked={createPublicationViewModel.schedule === 'later'}
                    onChange={() => createPublicationViewModel.setSchedule('later')}
                  />
                  Schedule
                </label>
              </div>
              {createPublicationViewModel.schedule === 'later' && (
                <input
                  type="datetime-local"
                  aria-label="Schedule date and time"
                  value={createPublicationViewModel.scheduledAt}
                  onChange={(e) => createPublicationViewModel.setScheduledAt(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-content"
                />
              )}
            </div>

            {createPublicationViewModel.formError && (
              <p className="text-sm text-danger">{createPublicationViewModel.formError}</p>
            )}

            <Button type="submit" size="lg" disabled={createPublicationViewModel.isSubmitting}>
              {createPublicationViewModel.isSubmitting
                ? 'Submitting…'
                : createPublicationViewModel.schedule === 'later'
                  ? 'Schedule'
                  : 'Publish now'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
