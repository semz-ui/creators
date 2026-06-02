import mongoose from 'mongoose';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

/**
 * Manages the single Mongoose connection for the process.
 * Mongoose maintains an internal connection pool, so we connect once at boot
 * and reuse it everywhere via the models.
 */
export async function connectMongo(uri: string = env.MONGO_URI): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

/** 1 === connected. Used by the health check. */
export function isMongoHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}
