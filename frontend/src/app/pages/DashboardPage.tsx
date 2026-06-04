import { useMe } from '@/modules/auth/viewmodels/useMe';
import { useSession } from '@/modules/auth/viewmodels/useSession';
import { Button, Card } from '@/shared/ui';

/** Placeholder authenticated home — the real dashboard arrives in F2. */
export function DashboardPage() {
  const { user, logout } = useSession();
  const { data: me } = useMe();
  const email = me?.email ?? user?.email;

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <Card className="space-y-3">
        <h1 className="font-display text-2xl font-bold text-content">You&apos;re in 🎬</h1>
        <p className="text-content-secondary">
          Signed in as <span className="font-medium text-content">{email}</span>.
        </p>
        <p className="text-sm text-content-muted">
          Your dashboard (create, library, analytics) lands in the next phases.
        </p>
        <Button variant="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </Card>
    </main>
  );
}
