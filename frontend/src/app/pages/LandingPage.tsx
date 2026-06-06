import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui';

const PLATFORMS = ['Facebook', 'Instagram', 'YouTube', 'TikTok'];

const STEPS = [
  { title: 'Prompt', body: 'Describe the video you want and pick a length.' },
  { title: 'Generate', body: 'AI turns your prompt into a ready-to-share clip.' },
  { title: 'Publish', body: 'Auto-post to every connected platform at once.' },
];

/** Marketing landing page — animated hero, how-it-works, and CTAs. */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Decorative animated background blobs. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 animate-float rounded-full bg-brand/20 blur-3xl" />
        <div
          className="absolute -right-24 top-1/3 h-80 w-80 animate-float rounded-full bg-brand-accent/20 blur-3xl"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-72 w-72 animate-float rounded-full bg-brand-secondary/15 blur-3xl"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold text-content">Reelo</span>
        <nav className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-content hover:bg-sunken"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-content-inverse hover:bg-brand-hover"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-center sm:pt-20">
        <p className="animate-fade-up font-mono text-sm uppercase tracking-widest text-brand">
          AI Video Studio
        </p>
        <h1
          className="mt-4 animate-fade-up font-display text-5xl font-bold tracking-tight text-content sm:text-6xl"
          style={{ animationDelay: '0.1s' }}
        >
          Prompt in. Video out. Everywhere.
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-lg text-content-secondary"
          style={{ animationDelay: '0.2s' }}
        >
          Generate short-form video from a prompt and auto-publish to Facebook, Instagram, YouTube,
          and TikTok — all in one flow.
        </p>

        <div
          className="mt-8 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '0.3s' }}
        >
          <Button size="lg" onClick={() => navigate('/signup')}>
            Get started
          </Button>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-medium text-content hover:bg-sunken"
          >
            I have an account
          </Link>
        </div>

        <ul
          className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: '0.4s' }}
          aria-label="Supported platforms"
        >
          {PLATFORMS.map((platform) => (
            <li
              key={platform}
              className="rounded-full border border-line-subtle bg-surface/70 px-3 py-1 text-sm text-content-secondary backdrop-blur"
            >
              {platform}
            </li>
          ))}
        </ul>
      </main>

      <section className="mx-auto max-w-5xl px-6 pb-24" aria-label="How it works">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="animate-fade-up rounded-xl border border-line-subtle bg-surface p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 font-display text-lg font-bold text-brand">
                {i + 1}
              </div>
              <h3 className="mt-4 font-display text-lg font-medium text-content">{step.title}</h3>
              <p className="mt-1 text-sm text-content-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line-subtle py-8 text-center text-sm text-content-muted">
        Reelo — prompt to published, automatically.
      </footer>
    </div>
  );
}
