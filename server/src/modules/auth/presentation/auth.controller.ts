import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';
import { respond } from '@shared/presentation/http/respond';

import type { GetCurrentUser } from '../application/get-current-user.usecase';
import type { LoginUser } from '../application/login-user.usecase';
import type { LogoutAllSessions, LogoutUser } from '../application/logout.usecase';
import type { RefreshTokens } from '../application/refresh-tokens.usecase';
import type { RegisterUser } from '../application/register-user.usecase';
import type { RequestPasswordReset } from '../application/request-password-reset.usecase';
import type { ResetPassword } from '../application/reset-password.usecase';
import type { SignInWithGoogle } from '../application/sign-in-with-google.usecase';

export interface AuthUseCases {
  register: RegisterUser;
  login: LoginUser;
  signInWithGoogle: SignInWithGoogle;
  refresh: RefreshTokens;
  logout: LogoutUser;
  logoutAll: LogoutAllSessions;
  getCurrentUser: GetCurrentUser;
  requestPasswordReset: RequestPasswordReset;
  resetPassword: ResetPassword;
}

/** Thin HTTP adapter: maps requests to use cases and shapes the JSON response. */
export class AuthController {
  constructor(private readonly useCases: AuthUseCases) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.register.execute(req.body);
    respond(res, 201, result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.login.execute(req.body);
    respond(res, 200, result);
  };

  signInWithGoogle = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.signInWithGoogle.execute(req.body);
    respond(res, 200, result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.useCases.refresh.execute(req.body);
    respond(res, 200, tokens);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.requestPasswordReset.execute(req.body);
    // Same response whether or not the account exists (anti-enumeration).
    respond(res, 202, {
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.resetPassword.execute(req.body);
    res.status(204).send();
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.logout.execute(req.body);
    res.status(204).send();
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    await this.useCases.logoutAll.execute(this.requireUserId(req));
    res.status(204).send();
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.useCases.getCurrentUser.execute(this.requireUserId(req));
    respond(res, 200, user);
  };

  /** Guarded routes always set req.userId; this narrows the type defensively. */
  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
