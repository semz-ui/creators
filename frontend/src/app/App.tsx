import { RouterProvider } from 'react-router-dom';

import { SessionBootstrap } from '@/modules/auth/presentation/SessionBootstrap';
import { configureAuth } from '@/modules/auth/session/configure-auth';
import { ErrorBoundary } from '@/shared/ui';

import { AppProviders } from './providers';
import { router } from './router';

// Wire the API client to the session store once, before anything renders.
configureAuth();

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <SessionBootstrap>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </SessionBootstrap>
      </AppProviders>
    </ErrorBoundary>
  );
}
