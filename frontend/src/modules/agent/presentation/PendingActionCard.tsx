import { ShieldQuestion } from 'lucide-react';

import { Button, Card } from '@/shared/ui';

import type { PendingAction } from '../data/agent.types';

interface PendingActionCardProps {
  action: PendingAction;
  isResolving: boolean;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * The confirmation gate. The agent has asked to do something irreversible —
 * publishing to a real account — and the server is holding the turn open until
 * this is answered. Nothing is posted until Approve is clicked.
 */
export function PendingActionCard({
  action,
  isResolving,
  onApprove,
  onReject,
}: PendingActionCardProps) {
  return (
    <Card glow className="mt-4">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <ShieldQuestion className="h-5 w-5 text-brand-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-content">Confirm before I do this</p>
          <p className="mt-1 text-sm text-content-secondary">{action.summary}</p>
          <p className="mt-1 text-xs text-content-muted">
            This posts to your real account and can&apos;t be undone from Reelo.
          </p>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={onApprove} disabled={isResolving}>
              {isResolving ? 'Working…' : 'Approve'}
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject} disabled={isResolving}>
              Reject
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
