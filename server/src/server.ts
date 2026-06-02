import type { Server } from 'node:http';

import { createApp } from './app';
import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';
import { connectMongo, disconnectMongo } from '@shared/infrastructure/database/mongo';
import { connectRedis, disconnectRedis } from '@shared/infrastructure/cache/redis';

async function bootstrap(): Promise<void> {
  // Fail fast: establish dependencies before accepting traffic.
  await Promise.all([connectMongo(), connectRedis()]);

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`🚀 Reelo server listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  setupGracefulShutdown(server);
}

/**
 * Drains in-flight requests, then closes Mongo and Redis. Bounded by a hard
 * timeout so a stuck connection can't block the process from exiting.
 */
function setupGracefulShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await Promise.allSettled([disconnectMongo(), disconnectRedis()]);
      clearTimeout(forceExit);
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

void bootstrap();
