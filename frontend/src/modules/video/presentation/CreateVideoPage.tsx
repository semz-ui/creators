import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';

import { GenerateVideoPanel } from './GenerateVideoPanel';
import { UploadVideoPanel } from './UploadVideoPanel';

type Tab = 'generate' | 'upload';

const panelVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction < 0 ? -12 : 12 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction < 0 ? 12 : -12,
    transition: { duration: 0.12 },
  }),
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'upload', label: 'Upload' },
];

export function CreateVideoPage() {
  const [tab, setTab] = useState<Tab>('generate');
  const direction = tab === 'generate' ? -1 : 1;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Add a video</h1>
      <p className="mt-1 text-content-secondary">Generate with AI or upload your own.</p>

      {/* Underline tab bar */}
      <div className="relative mt-6 flex border-b border-line-subtle" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-5 pb-3 text-sm font-medium transition-colors',
              tab === t.id ? 'text-content' : 'text-content-muted hover:text-content-secondary',
            )}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-gradient-brand"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Animated panel */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={tab}
          custom={direction}
          variants={panelVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {tab === 'generate' ? <GenerateVideoPanel /> : <UploadVideoPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
