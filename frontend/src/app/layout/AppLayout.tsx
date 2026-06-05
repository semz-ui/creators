import { NavLink, Outlet } from 'react-router-dom';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/create', label: 'Create' },
  { to: '/library', label: 'Library' },
  { to: '/publications', label: 'Publications' },
  { to: '/connections', label: 'Connections' },
];

/** Authenticated app shell: dark sidebar nav + topbar, with the routed page. */
export function AppLayout() {
  const { user, logout } = useSession();

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-inverse px-4 py-6 sm:flex">
        <span className="px-3 pb-6 font-display text-xl font-bold text-content-inverse">Reelo</span>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-content-inverse'
                    : 'text-content-inverse/70 hover:bg-white/5 hover:text-content-inverse',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line-subtle bg-surface px-6 py-3">
          <span className="text-sm text-content-muted">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </header>
        <main className="min-w-0 flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
