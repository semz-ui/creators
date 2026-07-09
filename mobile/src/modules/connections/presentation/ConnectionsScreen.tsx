import { Alert, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, Spinner } from '@/shared/ui';

import { PLATFORMS, type Connection, type Platform } from '../data/connections.types';
import { useConnections } from '../viewmodels/useConnections';
import { useConnectPlatform } from '../viewmodels/useConnectPlatform';
import { useDisconnect } from '../viewmodels/useDisconnect';

function PlatformRow({
  platform,
  label,
  connection,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  platform: Platform;
  label: string;
  connection: Connection | undefined;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: (platform: Platform) => void;
  onDisconnect: (connection: Connection) => void;
}) {
  const isConnected = connection?.status === 'active';

  return (
    <View className="flex-row items-center justify-between border-b border-line-subtle px-5 py-4 last:border-b-0">
      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold text-base text-content">{label}</Text>
        <Text className="font-sans text-xs text-content-muted">
          {isConnected ? connection.displayName : 'Not connected'}
        </Text>
      </View>
      {isConnected ? (
        <View className="flex-row items-center gap-3">
          <Badge label="Connected" tone="success" />
          <Button
            title="Disconnect"
            variant="secondary"
            size="sm"
            loading={disconnecting}
            onPress={() => onDisconnect(connection)}
          />
        </View>
      ) : (
        <Button
          title="Connect"
          size="sm"
          loading={connecting}
          onPress={() => onConnect(platform)}
        />
      )}
    </View>
  );
}

export function ConnectionsScreen() {
  const connections = useConnections();
  const { connect, pendingPlatform, isError: connectError } = useConnectPlatform();
  const { disconnect, pendingId } = useDisconnect();

  const byPlatform = new Map<Platform, Connection>(
    (connections.data ?? []).map((connection) => [connection.platform, connection]),
  );

  const confirmDisconnect = (connection: Connection) => {
    Alert.alert(
      'Disconnect account',
      `Scheduled posts to ${connection.displayName} will fail until you reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => disconnect(connection.id) },
      ],
    );
  };

  return (
    <Screen
      title="Connections"
      subtitle="Link the accounts you want to publish your videos to"
      showBack
      refreshing={connections.isRefetching}
      onRefresh={() => void connections.refetch()}
    >
      {connections.isPending ? (
        <Spinner />
      ) : connections.isError ? (
        <EmptyState
          title="Couldn't load your connections"
          message="Pull to refresh to try again."
        />
      ) : (
        <Card className="p-0">
          {PLATFORMS.map(({ id, label }) => (
            <PlatformRow
              key={id}
              platform={id}
              label={label}
              connection={byPlatform.get(id)}
              connecting={pendingPlatform === id}
              disconnecting={pendingId === byPlatform.get(id)?.id}
              onConnect={connect}
              onDisconnect={confirmDisconnect}
            />
          ))}
        </Card>
      )}
      {connectError ? (
        <Text className="mt-3 font-sans text-sm text-danger">
          Couldn&apos;t start the connection. Try again.
        </Text>
      ) : null}
    </Screen>
  );
}
