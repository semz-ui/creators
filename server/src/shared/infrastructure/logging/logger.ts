import { pino } from 'pino';

import { env, isProduction } from '@shared/infrastructure/config/env';

/**
 * Application-wide structured logger.
 * Pretty-prints in development; emits JSON in production for log aggregation.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});

export type Logger = typeof logger;
