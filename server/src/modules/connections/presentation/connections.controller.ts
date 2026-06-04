import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import type { CompleteConnection } from '../application/complete-connection.usecase';
import type { DisconnectConnection } from '../application/disconnect-connection.usecase';
import type { ListConnections } from '../application/list-connections.usecase';
import type { StartConnection } from '../application/start-connection.usecase';
import { parsePlatform } from '../domain/platform';
import { oauthCallbackQuerySchema } from './connections.validators';

export interface ConnectionsUseCases {
  start: StartConnection;
  complete: CompleteConnection;
  list: ListConnections;
  disconnect: DisconnectConnection;
}

export interface ConnectionsControllerConfig {
  /** When non-empty, the callback 302-redirects here instead of returning JSON. */
  redirectUrl: string;
}

/** HTTP adapter for the connections module. */
export class ConnectionsController {
  constructor(
    private readonly useCases: ConnectionsUseCases,
    private readonly config: ConnectionsControllerConfig,
  ) {}

  start = async (req: Request, res: Response): Promise<void> => {
    const platform = parsePlatform(String(req.params.platform));
    const result = await this.useCases.start.execute(this.requireUserId(req), platform);
    res.status(200).json(result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const connections = await this.useCases.list.execute(this.requireUserId(req));
    res.status(200).json({ items: connections });
  };

  disconnect = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.disconnect.execute(this.requireUserId(req), req.params.id as string);
    res.status(204).send();
  };

  /**
   * OAuth redirect target. Trusted via the `state` token (not Bearer auth).
   * Returns JSON, or 302-redirects to the configured frontend URL when set —
   * including on failure, so the SPA can show a friendly result.
   */
  callback = async (req: Request, res: Response): Promise<void> => {
    if (!this.config.redirectUrl) {
      const { state, code } = oauthCallbackQuerySchema.parse(req.query);
      const connection = await this.useCases.complete.execute({ state, code });
      res.status(200).json(connection);
      return;
    }

    try {
      const { state, code } = oauthCallbackQuerySchema.parse(req.query);
      const connection = await this.useCases.complete.execute({ state, code });
      res.redirect(
        302,
        `${this.config.redirectUrl}?status=success&platform=${connection.platform}`,
      );
    } catch {
      res.redirect(302, `${this.config.redirectUrl}?status=error`);
    }
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
