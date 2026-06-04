import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/shared/ui';

interface AuthFormLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Centered card layout shared by the login and register screens. */
export function AuthFormLayout({ title, subtitle, children, footer }: AuthFormLayoutProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <Link to="/" className="font-mono text-sm uppercase tracking-widest text-brand">
          Reelo
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-content">{title}</h1>
        <p className="mt-1 text-content-secondary">{subtitle}</p>
      </div>
      <Card>{children}</Card>
      <p className="text-center text-sm text-content-muted">{footer}</p>
    </main>
  );
}
