import { createBrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/modules/auth/presentation/LoginPage';
import { RegisterPage } from '@/modules/auth/presentation/RegisterPage';
import { RequireAuth } from '@/modules/auth/presentation/RequireAuth';

import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/signup', element: <RegisterPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <PlaceholderPage title="Not found" /> },
]);
