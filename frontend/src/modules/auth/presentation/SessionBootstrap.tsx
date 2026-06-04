import type { ReactNode } from 'react';

import { useBootstrapSession } from '../viewmodels/useBootstrapSession';

/** Blocks rendering until the persisted session has been restored on boot. */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const ready = useBootstrapSession();

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-content-muted" role="status">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
