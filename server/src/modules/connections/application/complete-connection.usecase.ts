import { logger } from '@shared/infrastructure/logging/logger';

import { Connection } from '../domain/connection.entity';
import { InvalidOAuthStateError, OAuthExchangeFailedError } from '../domain/connection.errors';
import type { IConnectionRepository } from '../domain/ports/connection-repository';
import type { IOAuthProviderRegistry } from '../domain/ports/oauth-provider';
import type { IOAuthStateStore } from '../domain/ports/oauth-state-store';
import { callbackUri } from './start-connection.usecase';
import { toPublicConnection, type CompleteConnectionInput, type PublicConnection } from './dto';

/**
 * Completes the OAuth flow: validates+consumes the state, exchanges the code
 * for tokens, and upserts the connection (reconnecting if one already exists
 * for that user+platform).
 */
export class CompleteConnection {
  constructor(
    private readonly providers: IOAuthProviderRegistry,
    private readonly stateStore: IOAuthStateStore,
    private readonly connections: IConnectionRepository,
    private readonly config: { publicBaseUrl: string },
  ) {}

  async execute(input: CompleteConnectionInput): Promise<PublicConnection> {
    const stateData = await this.stateStore.consume(input.state);
    if (!stateData) {
      throw new InvalidOAuthStateError();
    }

    const provider = this.providers.get(stateData.platform);

    let account;
    try {
      account = await provider.exchangeCode({
        code: input.code,
        redirectUri: callbackUri(this.config.publicBaseUrl),
      });
    } catch (err) {
      // The client gets the generic error; keep the provider's reason
      // (e.g. Google's error_description) in the server log.
      logger.warn({ err, platform: stateData.platform }, 'OAuth code exchange failed');
      throw new OAuthExchangeFailedError();
    }

    const existing = await this.connections.findByUserAndPlatform(
      stateData.userId,
      stateData.platform,
    );

    const connection = existing ?? Connection.create({ ...stateData, account });
    if (existing) {
      existing.reconnect(account);
    }

    await this.connections.save(connection);
    return toPublicConnection(connection);
  }
}
