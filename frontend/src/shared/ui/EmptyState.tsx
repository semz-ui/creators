import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

/** Consistent empty-state card with optional icon and action. */
export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="text-center">
        {Icon && (
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              <Icon className="h-6 w-6 text-content-muted" />
            </div>
          </div>
        )}
        <p className="font-medium text-content">{title}</p>
        {description && <p className="mt-1 text-sm text-content-secondary">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </Card>
    </motion.div>
  );
}
