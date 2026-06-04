import { useEffect, useState } from 'react';

import { restoreSession } from '../session/configure-auth';

/** Runs the one-time session restore on app boot; `true` once settled. */
export function useBootstrapSession(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void restoreSession().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}
