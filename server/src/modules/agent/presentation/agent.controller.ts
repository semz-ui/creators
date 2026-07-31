import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/domain/errors';
import { respond } from '@shared/presentation/http/respond';

import type { GetConversation } from '../application/get-conversation.usecase';
import type { ListConversations } from '../application/list-conversations.usecase';
import type { ResolveAgentAction } from '../application/resolve-agent-action.usecase';
import type { RunAgentTurn } from '../application/run-agent-turn.usecase';
import { presentConversation, presentConversationPage } from './agent.presenter';
import { listConversationsQuerySchema } from './agent.validators';
import type { ResolveActionBody, SendMessageBody } from './agent.validators';

export interface AgentUseCases {
  runTurn: RunAgentTurn;
  resolveAction: ResolveAgentAction;
  get: GetConversation;
  list: ListConversations;
}

/** HTTP adapter mapping requests to the agent use cases. */
export class AgentController {
  constructor(private readonly useCases: AgentUseCases) {}

  start = async (req: Request, res: Response): Promise<void> => {
    const { message } = req.body as SendMessageBody;
    const conversation = await this.useCases.runTurn.execute(this.requireUserId(req), { message });
    respond(res, 201, presentConversation(conversation));
  };

  send = async (req: Request, res: Response): Promise<void> => {
    // `id` is guaranteed by the `/conversations/:id/...` route.
    const conversationId = req.params.id as string;
    const { message } = req.body as SendMessageBody;
    const conversation = await this.useCases.runTurn.execute(this.requireUserId(req), {
      conversationId,
      message,
    });
    respond(res, 200, presentConversation(conversation));
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id as string;
    const toolUseId = req.params.toolUseId as string;
    const { decision } = req.body as ResolveActionBody;
    const conversation = await this.useCases.resolveAction.execute(this.requireUserId(req), {
      conversationId,
      toolUseId,
      decision,
    });
    respond(res, 200, presentConversation(conversation));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const conversation = await this.useCases.get.execute(this.requireUserId(req), id);
    respond(res, 200, presentConversation(conversation));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listConversationsQuerySchema.parse(req.query);
    const page = await this.useCases.list.execute(this.requireUserId(req), query);
    respond(res, 200, presentConversationPage(page));
  };

  private requireUserId(req: Request): string {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return req.userId;
  }
}
