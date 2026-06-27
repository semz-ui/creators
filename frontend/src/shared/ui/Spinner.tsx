import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Loading" className={cn('inline-flex', className)}>
      <motion.span
        className="inline-block h-5 w-5 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, #22d3ee 60%, transparent 100%)',
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
      />
    </span>
  );
}
