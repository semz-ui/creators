import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';
import { respond } from '@shared/presentation/http/respond';

import type { CreatePublication } from '../application/create-publication.usecase';
import type { GetPublication } from '../application/get-publication.usecase';
import type { ListPublications } from '../application/list-publications.usecase';
import type { RunDuePublications } from '../application/run-due-publications.usecase';
import { presentPublication, presentPublicationPage, presentRunDue } from './publishing.presenter';
import { listPublicationsQuerySchema } from './publishing.validators';

export interface PublishingUseCases {
  create: CreatePublication;
  get: GetPublication;
  list: ListPublications;
  runDue: RunDuePublications;
}

/** HTTP adapter for the publishing module. */
export class PublishingController {
  constructor(private readonly useCases: PublishingUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const publication = await this.useCases.create.execute(this.requireUserId(req), req.body);
    respond(res, 201, presentPublication(publication));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listPublicationsQuerySchema.parse(req.query);
    const page = await this.useCases.list.execute(this.requireUserId(req), query);
    respond(res, 200, presentPublicationPage(page));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const publication = await this.useCases.get.execute(this.requireUserId(req), id);
    respond(res, 200, presentPublication(publication));
  };

  processDue = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.runDue.execute();
    respond(res, 200, presentRunDue(result));
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
