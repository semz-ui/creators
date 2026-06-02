import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';

import type { GetCurrentUser } from '../application/get-current-user.usecase';
import type { LoginUser } from '../application/login-user.usecase';
import type { LogoutAllSessions, LogoutUser } from '../application/logout.usecase';
import type { RefreshTokens } from '../application/refresh-tokens.usecase';
import type { RegisterUser } from '../application/register-user.usecase';

export interface AuthUseCases {
  register: RegisterUser;
  login: LoginUser;
  refresh: RefreshTokens;
  logout: LogoutUser;
  logoutAll: LogoutAllSessions;
  getCurrentUser: GetCurrentUser;
}

/** Thin HTTP adapter: maps requests to use cases and shapes the JSON response. */
export class AuthController {
  constructor(private readonly useCases: AuthUseCases) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.register.execute(req.body);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.login.execute(req.body);
    res.status(200).json(result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.useCases.refresh.execute(req.body);
    res.status(200).json(tokens);
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
    res.status(200).json(user);
  };

  /** Guarded routes always set req.userId; this narrows the type defensively. */
  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
