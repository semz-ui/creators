import { NavLink, Outlet } from 'react-router-dom';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { BalanceChip } from '@/modules/billing/presentation/BalanceChip';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/create', label: 'Create' },
  { to: '/library', label: 'Library' },
  { to: '/publications', label: 'Publications' },
  { to: '/connections', label: 'Connections' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/billing', label: 'Billing' },
];

/** Authenticated app shell: dark sidebar nav + topbar, with the routed page. */
export function AppLayout() {
  const { user, logout } = useSession();

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-inverse px-4 py-6 sm:flex">
        <span className="px-3 pb-6 font-display text-xl font-bold text-content-inverse">Reelo</span>
        <nav aria-label="Primary" className="flex flex-col gap-1">
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
          <div className="flex items-center gap-3">
            <BalanceChip />
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </header>
        {/* Mobile nav — the sidebar is hidden below the sm breakpoint. */}
        <nav
          aria-label="Primary (mobile)"
          className="flex gap-1 overflow-x-auto border-b border-line-subtle bg-surface px-4 py-2 sm:hidden"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-sunken text-content' : 'text-content-secondary',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
