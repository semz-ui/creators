import type { RequestHandler, Router } from 'express';
import type { Redis } from 'ioredis';

import { RedisCacheService } from '@shared/infrastructure/cache/cache-service';
import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';
import { durationToSeconds } from '@shared/utils/duration';

import { GetCurrentUser } from './application/get-current-user.usecase';
import { LoginUser } from './application/login-user.usecase';
import { LogoutAllSessions, LogoutUser } from './application/logout.usecase';
import { RefreshTokens } from './application/refresh-tokens.usecase';
import { RegisterUser } from './application/register-user.usecase';
import { RequestPasswordReset } from './application/request-password-reset.usecase';
import { ResetPassword } from './application/reset-password.usecase';
import { SessionService } from './application/session.service';
import { SignInWithGoogle } from './application/sign-in-with-google.usecase';
import type { IEmailSender } from './domain/ports/email-sender';
import type { IGoogleIdentityVerifier } from './domain/ports/google-identity-verifier';
import { BcryptHasher } from './infrastructure/bcrypt-hasher';
import { CachedUserRepository } from './infrastructure/cached-user.repository';
import { GoogleIdTokenVerifier } from './infrastructure/google-id-token.verifier';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { MongoUserRepository } from './infrastructure/mongo-user.repository';
import { RedisPasswordResetTokenStore } from './infrastructure/redis-password-reset-token.store';
import { RedisRefreshTokenStore } from './infrastructure/redis-refresh-token.store';
import { ResendEmailSender } from './infrastructure/resend-email-sender';
import { StubEmailSender } from './infrastructure/stub-email-sender';
import { StubGoogleIdentityVerifier } from './infrastructure/stub-google-identity.verifier';
import { AuthController } from './presentation/auth.controller';
import { createAuthGuard } from './presentation/auth.guard';
import { createAuthRouter } from './presentation/auth.routes';

export interface AuthModuleDeps {
  redisClient: Redis;
  /** Strict rate-limit middleware applied to auth-sensitive routes. */
  authRateLimit: RequestHandler;
}

export interface AuthModule {
  router: Router;
  authGuard: RequestHandler;
}

/** Real Resend sender when its API key is configured, else the logging stub. */
function buildEmailSender(): IEmailSender {
  if (env.RESEND_API_KEY) {
    logger.info('Email: Resend');
    return new ResendEmailSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  }
  logger.info('Email: stub (set RESEND_API_KEY to send real email) — reset links are logged');
  return new StubEmailSender();
}

/** Real Google ID-token verifier when a client id is configured, else the stub. */
function buildGoogleVerifier(): IGoogleIdentityVerifier {
  if (env.GOOGLE_CLIENT_ID) {
    logger.info('Google sign-in: verifying real ID tokens');
    return new GoogleIdTokenVerifier({ clientId: env.GOOGLE_CLIENT_ID });
  }
  logger.info('Google sign-in: stub verifier (set GOOGLE_CLIENT_ID to verify real tokens)');
  return new StubGoogleIdentityVerifier();
}

/**
 * Composition root for the auth module: wires concrete infrastructure into the
 * application use cases and returns the HTTP router + a reusable access guard.
 */
export function buildAuthModule({ redisClient, authRateLimit }: AuthModuleDeps): AuthModule {
  const cache = new RedisCacheService(redisClient);
  const users = new CachedUserRepository(new MongoUserRepository(), cache, env.CACHE_DEFAULT_TTL);
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
  const resetTokens = new RedisPasswordResetTokenStore(redisClient);
  const emailSender = buildEmailSender();

  const controller = new AuthController({
    register: new RegisterUser(users, hasher, sessions),
    login: new LoginUser(users, hasher, sessions),
    signInWithGoogle: new SignInWithGoogle(buildGoogleVerifier(), users, sessions),
    refresh: new RefreshTokens(tokens, refreshStore, sessions),
    logout: new LogoutUser(tokens, refreshStore),
    logoutAll: new LogoutAllSessions(refreshStore),
    getCurrentUser: new GetCurrentUser(users),
    requestPasswordReset: new RequestPasswordReset(users, resetTokens, emailSender, {
      ttlSeconds: env.PASSWORD_RESET_TTL,
      resetBaseUrl: env.PASSWORD_RESET_URL,
    }),
    resetPassword: new ResetPassword(resetTokens, users, hasher, refreshStore),
  });

  const authGuard = createAuthGuard(tokens);

  return { router: createAuthRouter(controller, authGuard, authRateLimit), authGuard };
}
