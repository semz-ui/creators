import { createBrowserRouter } from 'react-router-dom';

import { AgentPage } from '@/modules/agent/presentation/AgentPage';
import { AnalyticsOverviewPage } from '@/modules/analytics/presentation/AnalyticsOverviewPage';
import { VideoAnalyticsPage } from '@/modules/analytics/presentation/VideoAnalyticsPage';
import { ForgotPasswordPage } from '@/modules/auth/presentation/ForgotPasswordPage';
import { LoginPage } from '@/modules/auth/presentation/LoginPage';
import { RegisterPage } from '@/modules/auth/presentation/RegisterPage';
import { ResetPasswordPage } from '@/modules/auth/presentation/ResetPasswordPage';
import { RequireAuth } from '@/modules/auth/presentation/RequireAuth';
import { BillingPage } from '@/modules/billing/presentation/BillingPage';
import { ConnectionCallbackPage } from '@/modules/connections/presentation/ConnectionCallbackPage';
import { ConnectionsPage } from '@/modules/connections/presentation/ConnectionsPage';
import { PublicationDetailPage } from '@/modules/publishing/presentation/PublicationDetailPage';
import { PublicationsPage } from '@/modules/publishing/presentation/PublicationsPage';
import { PublishPage } from '@/modules/publishing/presentation/PublishPage';
import { CreateVideoPage } from '@/modules/video/presentation/CreateVideoPage';
import { DashboardPage } from '@/modules/video/presentation/DashboardPage';
import { LibraryPage } from '@/modules/video/presentation/LibraryPage';
import { VideoDetailPage } from '@/modules/video/presentation/VideoDetailPage';

import { AppLayout } from './layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { ModeChooserPage } from './pages/ModeChooserPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RouteError } from './pages/RouteError';

export const router = createBrowserRouter(
  [
    { path: '/', element: <LandingPage />, errorElement: <RouteError /> },
    { path: '/signup', element: <RegisterPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    // Authenticated but outside AppLayout: the chooser and the assistant own
    // the whole viewport rather than sitting inside the studio shell.
    {
      path: '/choose',
      element: (
        <RequireAuth>
          <ModeChooserPage />
        </RequireAuth>
      ),
      errorElement: <RouteError />,
    },
    {
      path: '/agent',
      element: (
        <RequireAuth>
          <AgentPage />
        </RequireAuth>
      ),
      errorElement: <RouteError />,
    },
    {
      path: '/agent/:conversationId',
      element: (
        <RequireAuth>
          <AgentPage />
        </RequireAuth>
      ),
      errorElement: <RouteError />,
    },
    {
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      errorElement: <RouteError />,
      children: [
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/create', element: <CreateVideoPage /> },
        { path: '/library', element: <LibraryPage /> },
        { path: '/videos/:id', element: <VideoDetailPage /> },
        { path: '/videos/:id/publish', element: <PublishPage /> },
        { path: '/videos/:id/analytics', element: <VideoAnalyticsPage /> },
        { path: '/publications', element: <PublicationsPage /> },
        { path: '/publications/:id', element: <PublicationDetailPage /> },
        { path: '/connections', element: <ConnectionsPage /> },
        { path: '/connections/callback', element: <ConnectionCallbackPage /> },
        { path: '/analytics', element: <AnalyticsOverviewPage /> },
        { path: '/billing', element: <BillingPage /> },
      ],
    },
    { path: '*', element: <PlaceholderPage title="Not found" /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
