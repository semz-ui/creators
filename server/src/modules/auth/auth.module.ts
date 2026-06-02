import type { RequestHandler, Router } from 'express';
import type { Redis } from 'ioredis';

import { env } from '@shared/infrastructure/config/env';
import { durationToSeconds } from '@shared/utils/duration';

import { GetCurrentUser } from './application/get-current-user.usecase';
import { LoginUser } from './application/login-user.usecase';
import { LogoutAllSessions, LogoutUser } from './application/logout.usecase';
import { RefreshTokens } from './application/refresh-tokens.usecase';
import { RegisterUser } from './application/register-user.usecase';
import { SessionService } from './application/session.service';
import { BcryptHasher } from './infrastructure/bcrypt-hasher';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { MongoUserRepository } from './infrastructure/mongo-user.repository';
import { RedisRefreshTokenStore } from './infrastructure/redis-refresh-token.store';
import { AuthController } from './presentation/auth.controller';
import { createAuthGuard } from './presentation/auth.guard';
import { createAuthRouter } from './presentation/auth.routes';

export interface AuthModuleDeps {
  redisClient: Redis;
}

export interface AuthModule {
  router: Router;
  authGuard: RequestHandler;
}

/**
 * Composition root for the auth module: wires concrete infrastructure into the
 * application use cases and returns the HTTP router + a reusable access guard.
 */
export function buildAuthModule({ redisClient }: AuthModuleDeps): AuthModule {
  const users = new MongoUserRepository();
  const hasher = new BcryptHasher();
  const tokens = new JwtTokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  });
  const refreshStore = new RedisRefreshTokenStore(
    redisClient,
    durationToSeconds(env.JWT_REFRESH_TTL),
  );
  const sessions = new SessionService(tokens, refreshStore);

  const controller = new AuthController({
    register: new RegisterUser(users, hasher, sessions),
    login: new LoginUser(users, hasher, sessions),
    refresh: new RefreshTokens(tokens, refreshStore, sessions),
    logout: new LogoutUser(tokens, refreshStore),
    logoutAll: new LogoutAllSessions(refreshStore),
    getCurrentUser: new GetCurrentUser(users),
  });

  const authGuard = createAuthGuard(tokens);

  return { router: createAuthRouter(controller, authGuard), authGuard };
}
