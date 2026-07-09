import { isDevelopment } from '@/shared/config/env';

/**
 * Lightweight context-scoped logger. All output is suppressed outside of
 * development so production builds stay quiet. Create one per module/component
 * via `logger('MyContext')`.
 */
class Logger {
  private context: string;
  private isDev: boolean;

  constructor(context: string) {
    this.context = context;
    this.isDev = isDevelopment;
  }

  private format(level: string, message: string): string {
    return `[${new Date().toISOString()}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.log(this.format('INFO', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.error(this.format('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.warn(this.format('WARN', message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.debug(this.format('DEBUG', message), ...args);
    }
  }
}

export const logger = (context: string): Logger => new Logger(context);
