import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquare, type LucideIcon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import { routeForMode, useModeStore, type AppMode } from '@/shared/preferences/mode.store';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface ModeOption {
  id: AppMode;
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
}

const OPTIONS: ModeOption[] = [
  {
    id: 'assistant',
    icon: MessageSquare,
    title: 'Assistant',
    description: "Describe what you want and I'll make it and post it.",
    points: ['One conversation, start to finish', 'Always asks before it posts'],
  },
  {
    id: 'studio',
    icon: LayoutDashboard,
    title: 'Studio',
    description: 'The full workspace — every control, laid out.',
    points: ['Forms, library and analytics', 'Schedule posts per platform'],
  },
];

/** One-time picker between the two experiences, shown right after signing in. */
export function ModeChooserPage() {
  const navigate = useNavigate();
  const mode = useModeStore((s) => s.mode);
  const setMode = useModeStore((s) => s.setMode);

  // Already chosen — don't ask again; the switcher can still link here.
  if (mode) {
    return <Navigate to={routeForMode(mode)} replace />;
  }

  const choose = (next: AppMode) => {
    setMode(next);
    navigate(routeForMode(next), { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <motion.div
        className="w-full max-w-3xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-center font-display text-3xl font-bold text-gradient-brand"
          variants={itemVariants}
        >
          How do you want to work?
        </motion.h1>
        <motion.p className="mt-2 text-center text-content-secondary" variants={itemVariants}>
          Pick one to get started. You can switch whenever you like.
        </motion.p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              whileTap={{ scale: 0.98 }}
              variants={itemVariants}
              className="flex flex-col rounded-xl border border-line-subtle bg-surface p-6 text-left transition-all duration-150 hover:border-brand/40 hover:shadow-glow-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                <option.icon className="h-5 w-5 text-brand-accent" />
              </div>
              <p className="mt-4 font-display text-xl font-bold text-content">{option.title}</p>
              <p className="mt-1 text-sm text-content-secondary">{option.description}</p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {option.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-content-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-accent" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
