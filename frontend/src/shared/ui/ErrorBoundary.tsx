import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

const DefaultFallback = (
  <div className="flex min-h-full items-center justify-center px-6 py-16">
    <div className="max-w-md rounded-xl border border-line-subtle bg-surface p-6 text-center shadow-sm">
      <h1 className="font-display text-xl font-bold text-content">Something went wrong</h1>
      <p className="mt-2 text-content-secondary">
        An unexpected error occurred. Try reloading the page.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
      >
        Reload
      </button>
    </div>
  </div>
);

/** Catches render errors anywhere below it and shows a fallback. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? DefaultFallback;
    }
    return this.props.children;
  }
}
