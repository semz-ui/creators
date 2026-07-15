import { Badge, Button, Card, Spinner } from '@/shared/ui';

import { useConnectPlatform } from '../viewmodels/useConnectPlatform';
import { useDisconnect } from '../viewmodels/useDisconnect';
import { usePlatformRows } from '../viewmodels/usePlatformRows';

export function ConnectionsPage() {
  const { rows, isPending, isError } = usePlatformRows();
  const { connect, pendingPlatform } = useConnectPlatform();
  const { disconnect, pendingId } = useDisconnect();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Connections</h1>
      <p className="mt-1 text-content-secondary">
        Link the accounts you want to publish your videos to.
      </p>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="mt-6 text-content-secondary">Couldn&apos;t load your connections.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map(({ id, label, connection }) => (
            <li key={id}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-content">{label}</p>
                  {connection ? (
                    <p className="text-sm text-content-muted">{connection.displayName}</p>
                  ) : (
                    <p className="text-sm text-content-muted">Not connected</p>
                  )}
                </div>
                {connection ? (
                  <div className="flex items-center gap-3">
                    <Badge tone="success">Connected</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === connection.id}
                      onClick={() => disconnect(connection.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" disabled={pendingPlatform === id} onClick={() => connect(id)}>
                    {pendingPlatform === id ? 'Connecting…' : 'Connect'}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
