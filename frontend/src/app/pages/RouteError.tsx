import { Link, useRouteError } from 'react-router-dom';

import { logger } from '@/shared/lib/logger';

/** Router `errorElement` — shown when a route throws while rendering. */
export function RouteError() {
  const error = useRouteError();
  logger('RouteError').error('Route error:', error);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-content">This page hit a snag</h1>
      <p className="text-content-secondary">Something went wrong loading this view.</p>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
      >
        Go home
      </Link>
    </main>
  );
}
