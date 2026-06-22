import { useState } from 'react';

import { cn } from '@/shared/lib/cn';

import { GenerateVideoPanel } from './GenerateVideoPanel';
import { UploadVideoPanel } from './UploadVideoPanel';

type Tab = 'generate' | 'upload';

export function CreateVideoPage() {
  const [tab, setTab] = useState<Tab>('generate');

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Add a video</h1>
      <p className="mt-1 text-content-secondary">Generate with AI or upload your own.</p>

      <div className="mt-4 flex gap-1 rounded-lg bg-sunken p-1" role="tablist">
        <TabButton active={tab === 'generate'} onClick={() => setTab('generate')}>
          Generate
        </TabButton>
        <TabButton active={tab === 'upload'} onClick={() => setTab('upload')}>
          Upload
        </TabButton>
      </div>

      {tab === 'generate' ? <GenerateVideoPanel /> : <UploadVideoPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-surface text-content shadow-sm' : 'text-content-secondary hover:text-content',
      )}
    >
      {children}
    </button>
  );
}
