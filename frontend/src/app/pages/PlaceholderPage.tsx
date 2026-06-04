import { Link } from 'react-router-dom';

import { Card } from '@/shared/ui';

/** Temporary stand-in for routes built in later phases. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Card className="w-full">
        <h1 className="font-display text-2xl font-medium text-content">{title}</h1>
        <p className="mt-2 text-content-secondary">Coming soon.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          ← Back home
        </Link>
      </Card>
    </main>
  );
}
