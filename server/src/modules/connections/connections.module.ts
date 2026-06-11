import type { RequestHandler, Router } from 'express';
import type { Redis } from 'ioredis';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

import type { IConnectionRepository } from './domain/ports/connection-repository';
import type { IOAuthProviderRegistry } from './domain/ports/oauth-provider';
import { CompleteConnection } from './application/complete-connection.usecase';
import { ConnectionAccessService } from './application/connection-access.service';
import { DisconnectConnection } from './application/disconnect-connection.usecase';
import { ListConnections } from './application/list-connections.usecase';
import { StartConnection } from './application/start-connection.usecase';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
import { MongoConnectionRepository } from './infrastructure/mongo-connection.repository';
import {
  buildProviderRegistry,
  type ProviderRegistryConfig,
} from './infrastructure/oauth-provider-registry';
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
  /** Hands out fresh access tokens (refreshing expiring ones) for other modules. */
  connectionAccess: ConnectionAccessService;
}

/** Composition root for the connections module. */
export function buildConnectionsModule({
  authGuard,
  redisClient,
}: ConnectionsModuleDeps): ConnectionsModule {
  const cipher = new AesGcmTokenCipher(env.CONNECTIONS_ENC_KEY);
  const connections = new MongoConnectionRepository(cipher);
  const stateStore = new RedisOAuthStateStore(redisClient);
  const providers = buildProviders();

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
    connectionAccess: new ConnectionAccessService(connections, providers),
  };
}

/**
 * Real OAuth providers for the platforms whose credentials are configured
 * (each schema-validated as a pair); every other platform falls back to the
 * stub so the app still boots and works for local dev / tests.
 */
function buildProviders(): IOAuthProviderRegistry {
  const config: ProviderRegistryConfig = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    config.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  if (env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET) {
    config.instagram = { appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET };
  }

  const real = [
    ...(config.google ? ['youtube (Google)'] : []),
    ...(config.instagram ? ['instagram'] : []),
  ];
  if (real.length > 0) {
    logger.info(`Connections: real OAuth for ${real.join(', ')} (other platforms stubbed)`);
  } else {
    logger.info(
      'Connections: stub OAuth providers (set GOOGLE_CLIENT_ID/SECRET for YouTube, INSTAGRAM_APP_ID/SECRET for Instagram)',
    );
  }
  return buildProviderRegistry(config);
}
