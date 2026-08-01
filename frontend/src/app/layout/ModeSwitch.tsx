import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';
import { routeForMode, useModeStore, type AppMode } from '@/shared/preferences/mode.store';

const MODES: { id: AppMode; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'assistant', label: 'Assistant' },
];

/**
 * Switches between the two experiences from either shell. The stored
 * preference follows the switch, so the next login lands where they left off.
 */
export function ModeSwitch() {
  const navigate = useNavigate();
  const location = useLocation();
  const setMode = useModeStore((s) => s.setMode);

  const active: AppMode = location.pathname.startsWith('/agent') ? 'assistant' : 'studio';

  const select = (mode: AppMode) => {
    if (mode === active) return;
    setMode(mode);
    navigate(routeForMode(mode));
  };

  return (
    <div
      role="tablist"
      aria-label="Experience"
      className="relative flex rounded-lg bg-sunken p-0.5"
    >
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="tab"
          aria-selected={active === mode.id}
          onClick={() => select(mode.id)}
          className={cn(
            'relative rounded-md px-3 py-1 text-xs font-medium transition-colors',
            active === mode.id ? 'text-content' : 'text-content-muted hover:text-content-secondary',
          )}
        >
          {active === mode.id && (
            <motion.span
              layoutId="mode-indicator"
              className="absolute inset-0 rounded-md bg-white/8"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
