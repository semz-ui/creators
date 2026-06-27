import { AnimatePresence, motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { Video } from '../data/video.types';
import { StatusBadge } from './StatusBadge';

export function VideoCard({ video }: { video: Video }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.15 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link to={`/videos/${video.id}`} className="block focus-visible:outline-none">
        <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden bg-sunken">
            {video.status === 'ready' && video.resultUrl ? (
              <video src={video.resultUrl} className="h-full w-full object-cover" muted />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-dark">
                <Play className="h-8 w-8 text-white/20" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />

            {/* Title + badge on overlay */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-2.5">
              <p className="line-clamp-2 text-xs font-medium text-white drop-shadow-sm">
                {video.title ?? video.prompt}
              </p>
              <div className="shrink-0">
                <StatusBadge status={video.status} />
              </div>
            </div>

            {/* Duration — top-right corner */}
            {video.durationSeconds != null && (
              <span className="absolute right-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                {video.durationSeconds}s
              </span>
            )}

            {/* Hover actions */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-semibold text-white shadow-glow-sm">
                    Open
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
