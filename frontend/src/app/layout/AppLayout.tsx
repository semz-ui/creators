import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2,
  CreditCard,
  Film,
  LayoutDashboard,
  Link2,
  LogOut,
  Send,
  Sparkles,
} from 'lucide-react';
import { useLocation, NavLink, Outlet } from 'react-router-dom';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { BalanceChip } from '@/modules/billing/presentation/BalanceChip';
import { cn } from '@/shared/lib/cn';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Create', icon: Sparkles },
  { to: '/library', label: 'Library', icon: Film },
  { to: '/publications', label: 'Publications', icon: Send },
  { to: '/connections', label: 'Connections', icon: Link2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/billing', label: 'Billing', icon: CreditCard },
];

const sidebarVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function initials(email: string): string {
  const [local = ''] = email.split('@');
  return local.slice(0, 2).toUpperCase();
}

/** Authenticated app shell: dark sidebar + minimal topbar with animated page transitions. */
export function AppLayout() {
  const { user, logout } = useSession();
  const location = useLocation();

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line-subtle bg-surface sm:flex">
        <div className="px-4 pb-4 pt-6">
          <span className="font-display text-xl font-bold text-gradient-brand">Reelo</span>
        </div>

        <motion.nav
          aria-label="Primary"
          className="flex flex-1 flex-col gap-0.5 px-3"
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
        >
          {NAV.map((item) => (
            <motion.div key={item.to} variants={navItemVariants}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/8 text-content'
                      : 'text-content-secondary hover:bg-white/5 hover:text-content',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-gradient-brand"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-accent' : '')}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>

        <div className="border-t border-line-subtle px-4 py-4">
          <BalanceChip />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-line-subtle bg-canvas px-6 py-3">
          <span className="text-sm text-content-muted">{user?.email}</span>
          <div className="flex items-center gap-3">
            {user?.email && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                {initials(user.email)}
              </div>
            )}
            <button
              onClick={() => void logout()}
              aria-label="Log out"
              className="rounded-md p-1.5 text-content-muted transition-colors hover:bg-white/5 hover:text-content"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile nav */}
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
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/8 text-content' : 'text-content-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-3.5 w-3.5', isActive ? 'text-brand-accent' : '')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="min-w-0 flex-1 px-6 py-8"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
