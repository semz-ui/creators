import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Card, Spinner } from '@/shared/ui';

import { useRefreshConnections } from '../viewmodels/useRefreshConnections';

/**
 * Landing page for the OAuth return (the backend redirects here with
 * `?status=`). Refreshes the connections list and bounces back to /connections.
 */
export function ConnectionCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const refreshConnections = useRefreshConnections();
  const failed = params.get('status') === 'error';

  useEffect(() => {
    refreshConnections();
    const timer = setTimeout(() => navigate('/connections', { replace: true }), 1200);
    return () => clearTimeout(timer);
  }, [navigate, refreshConnections]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-20">
      <Card className="flex w-full flex-col items-center gap-3 text-center">
        {!failed && <Spinner />}
        <p className="text-content">
          {failed ? "We couldn't link that account." : 'Account linked! Taking you back…'}
        </p>
      </Card>
    </div>
  );
}
