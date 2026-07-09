import { motion } from 'framer-motion';
import { Film, Sparkles, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { CardGridSkeleton, EmptyState } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const heroVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function DashboardPage() {
  const { user } = useSession();
  const { data, isPending, isError } = useVideoLibrary(1, 6);

  const totalVideos = data?.total ?? 0;
  const published = data?.items.filter((v) => v.status === 'ready').length ?? 0;

  return (
    <div>
      {/* Hero */}
      <motion.div className="mb-10" variants={heroVariants} initial="hidden" animate="visible">
        <motion.p className="mb-1 text-sm text-content-secondary" variants={heroItem}>
          {greeting()}
          {user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </motion.p>
        <motion.h1
          className="font-display text-4xl font-bold text-gradient-brand"
          variants={heroItem}
        >
          Turn a prompt into a video.
        </motion.h1>
        <motion.p className="mt-2 text-content-secondary" variants={heroItem}>
          AI-powered creation — from idea to published content in minutes.
        </motion.p>
        <motion.div className="mt-5 flex flex-wrap gap-3" variants={heroItem}>
          <Link
            to="/create"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-gradient-brand px-6 text-base font-medium text-white shadow-glow-sm transition-shadow hover:shadow-glow-brand"
          >
            <Sparkles className="h-4 w-4" />
            Create video
          </Link>
          <Link
            to="/library"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-surface-raised px-6 text-base font-medium text-content ring-1 ring-white/10 transition-all hover:ring-white/20"
          >
            <Film className="h-4 w-4" />
            Library
          </Link>
        </motion.div>
      </motion.div>

      {/* Stat row */}
      <motion.div
        className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          { label: 'Total Videos', value: totalVideos, icon: Film },
          { label: 'Ready', value: published, icon: Upload },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={cardItem}
            className="flex items-center gap-4 rounded-xl border border-line-subtle bg-surface-raised p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <stat.icon className="h-5 w-5 text-brand-accent" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-content">{stat.value}</p>
              <p className="text-xs text-content-muted">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent grid */}
      <h2 className="mb-4 font-display text-lg font-semibold text-content">Recent</h2>
      {isPending ? (
        <CardGridSkeleton count={3} />
      ) : isError ? (
        <p className="text-content-secondary">Couldn&apos;t load your videos.</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No videos yet"
          description="Create your first one to get started."
          action={
            <Link
              to="/create"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-brand px-3 text-sm font-medium text-white shadow-glow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create video
            </Link>
          }
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {data.items.map((video) => (
            <motion.div key={video.id} variants={cardItem}>
              <VideoCard video={video} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
