import { pino } from 'pino';

import { env } from '@shared/infrastructure/config/env';

const usePrettyTransport = env.NODE_ENV === 'development';

/**
 * Application-wide structured logger.
 * Pretty-prints in development; emits JSON in production for log aggregation.
 * In test we skip the transport entirely to avoid spawning worker threads.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(usePrettyTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
