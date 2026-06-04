import { Link, useNavigate } from 'react-router-dom';

import { Button, Card } from '@/shared/ui';

/** Placeholder landing page — verifies the shell, tokens, and routing wire up. */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-4">
        <p className="font-mono text-sm uppercase tracking-widest text-brand">Reelo</p>
        <h1 className="font-display text-5xl font-bold tracking-tight text-content">
          Prompt in. Video out. Everywhere.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-content-secondary">
          Generate short-form video from a prompt and auto-publish to Facebook, Instagram, YouTube,
          and TikTok.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => navigate('/signup')}>
            Get started
          </Button>
          <p className="text-sm text-content-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
