import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from './pages/LandingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  // Replaced by real pages in later phases.
  { path: '/signup', element: <PlaceholderPage title="Sign up" /> },
  { path: '/login', element: <PlaceholderPage title="Log in" /> },
  { path: '*', element: <PlaceholderPage title="Not found" /> },
]);
