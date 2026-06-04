import { createBrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/modules/auth/presentation/LoginPage';
import { RegisterPage } from '@/modules/auth/presentation/RegisterPage';
import { RequireAuth } from '@/modules/auth/presentation/RequireAuth';
import { CreateVideoPage } from '@/modules/video/presentation/CreateVideoPage';
import { DashboardPage } from '@/modules/video/presentation/DashboardPage';
import { LibraryPage } from '@/modules/video/presentation/LibraryPage';
import { VideoDetailPage } from '@/modules/video/presentation/VideoDetailPage';

import { AppLayout } from './layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/signup', element: <RegisterPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/create', element: <CreateVideoPage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/videos/:id', element: <VideoDetailPage /> },
    ],
  },
  { path: '*', element: <PlaceholderPage title="Not found" /> },
]);
