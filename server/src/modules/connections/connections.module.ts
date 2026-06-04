import type { RequestHandler, Router } from 'express';
import type { Redis } from 'ioredis';

import { env } from '@shared/infrastructure/config/env';

import type { IConnectionRepository } from './domain/ports/connection-repository';
import { CompleteConnection } from './application/complete-connection.usecase';
import { DisconnectConnection } from './application/disconnect-connection.usecase';
import { ListConnections } from './application/list-connections.usecase';
import { StartConnection } from './application/start-connection.usecase';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
import { MongoConnectionRepository } from './infrastructure/mongo-connection.repository';
import { buildStubProviderRegistry } from './infrastructure/oauth-provider-registry';
import { RedisOAuthStateStore } from './infrastructure/redis-oauth-state-store';
import { ConnectionsController } from './presentation/connections.controller';
import { createConnectionsRouter } from './presentation/connections.routes';

export interface ConnectionsModuleDeps {
  authGuard: RequestHandler;
  redisClient: Redis;
}

export interface ConnectionsModule {
  router: Router;
  /** Exposed so other modules (e.g. Publishing) can read connections via an adapter. */
  connectionRepository: IConnectionRepository;
}

/** Composition root for the connections module. */
export function buildConnectionsModule({
  authGuard,
  redisClient,
}: ConnectionsModuleDeps): ConnectionsModule {
  const cipher = new AesGcmTokenCipher(env.CONNECTIONS_ENC_KEY);
  const connections = new MongoConnectionRepository(cipher);
  const stateStore = new RedisOAuthStateStore(redisClient);
  const providers = buildStubProviderRegistry();

  const controller = new ConnectionsController(
    {
      start: new StartConnection(providers, stateStore, {
        publicBaseUrl: env.PUBLIC_BASE_URL,
        stateTtlSeconds: env.OAUTH_STATE_TTL,
      }),
      complete: new CompleteConnection(providers, stateStore, connections, {
        publicBaseUrl: env.PUBLIC_BASE_URL,
      }),
      list: new ListConnections(connections),
      disconnect: new DisconnectConnection(connections),
    },
    { redirectUrl: env.CONNECTIONS_REDIRECT_URL },
  );

  return {
    router: createConnectionsRouter(controller, authGuard),
    connectionRepository: connections,
  };
}
