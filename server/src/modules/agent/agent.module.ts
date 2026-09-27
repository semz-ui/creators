import type { RequestHandler, Router } from 'express';

import { env } from '@shared/infrastructure/config/env';
import { logger } from '@shared/infrastructure/logging/logger';

import type { ListConnections } from '@modules/connections/application/list-connections.usecase';
import type { CreatePublication } from '@modules/publishing/application/create-publication.usecase';
import type { CreateVideo } from '@modules/video/application/create-video.usecase';
import type { GetVideo } from '@modules/video/application/get-video.usecase';
import type { ListVideos } from '@modules/video/application/list-videos.usecase';
import type { ReconcileGeneration } from '@modules/video/application/reconcile-generation.usecase';

import type { IAgentModel } from './domain/ports/agent-model';
import { AgentLoop } from './application/agent-loop.service';
import { GetConversation } from './application/get-conversation.usecase';
import { ListConversations } from './application/list-conversations.usecase';
import { ResolveAgentAction } from './application/resolve-agent-action.usecase';
import { RunAgentTurn } from './application/run-agent-turn.usecase';
import { ClaudeAgentModel } from './infrastructure/claude-agent-model';
import { ConnectionActionsAdapter } from './infrastructure/connection-actions.adapter';
import { MongoConversationRepository } from './infrastructure/mongo-conversation.repository';
import { PublishingActionsAdapter } from './infrastructure/publishing-actions.adapter';
import { StubAgentModel } from './infrastructure/stub-agent-model';
import { VideoActionsAdapter } from './infrastructure/video-actions.adapter';
import { GenerateVideoTool } from './infrastructure/tools/generate-video.tool';
import { GetVideoTool } from './infrastructure/tools/get-video.tool';
import { ListConnectionsTool } from './infrastructure/tools/list-connections.tool';
import { ListVideosTool } from './infrastructure/tools/list-videos.tool';
import { PublishVideoTool } from './infrastructure/tools/publish-video.tool';
import { StaticAgentToolRegistry } from './infrastructure/tools/tool-registry';
import { AgentController } from './presentation/agent.controller';
import { createAgentRouter } from './presentation/agent.routes';

export interface AgentModuleDeps {
  /** Shared access guard from the auth module. */
  authGuard: RequestHandler;
  /** Stricter rate-limit tier for turn-running routes. */
  agentRateLimit: RequestHandler;
  /** Live use cases from the modules the agent drives (built by the container). */
  video: {
    createVideo: CreateVideo;
    getVideo: GetVideo;
    listVideos: ListVideos;
    reconcileGeneration: ReconcileGeneration;
  };
  publishing: { createPublication: CreatePublication };
  connections: { listConnections: ListConnections };
}

export interface AgentModule {
  router: Router;
}

/** Composition root for the agent module. */
export function buildAgentModule({
  authGuard,
  agentRateLimit,
  video,
  publishing,
  connections,
}: AgentModuleDeps): AgentModule {
  const conversations = new MongoConversationRepository();

  const videoActions = new VideoActionsAdapter(
    video.createVideo,
    video.getVideo,
    video.listVideos,
    video.reconcileGeneration,
  );
  const publishingActions = new PublishingActionsAdapter(publishing.createPublication);
  const connectionActions = new ConnectionActionsAdapter(connections.listConnections);

  // Order is stable so the tool list sent to the model doesn't change between
  // requests — a changing tool list invalidates the prompt cache.
  const tools = new StaticAgentToolRegistry([
    new ListConnectionsTool(connectionActions),
    new ListVideosTool(videoActions),
    new GetVideoTool(videoActions),
    new GenerateVideoTool(videoActions),
    new PublishVideoTool(publishingActions),
  ]);

  const loop = new AgentLoop(buildModel(), tools, {
    maxIterations: env.AGENT_MAX_ITERATIONS,
    maxHistoryMessages: env.AGENT_MAX_HISTORY_MESSAGES,
  });

  const controller = new AgentController({
    runTurn: new RunAgentTurn(conversations, loop),
    resolveAction: new ResolveAgentAction(conversations, tools, loop),
    get: new GetConversation(conversations),
    list: new ListConversations(conversations),
  });

  return { router: createAgentRouter(controller, authGuard, agentRateLimit) };
}

/**
 * Real model when a key is configured, deterministic stub otherwise — the same
 * dual-mode convention as the video generators and social publishers, so the
 * whole conversational flow works locally and on the demo for free.
 */
function buildModel(): IAgentModel {
  if (!env.ANTHROPIC_API_KEY) {
    logger.info('Agent: stub model (set ANTHROPIC_API_KEY to use Claude)');
    return new StubAgentModel();
  }

  logger.info(`Agent: Claude (${env.AGENT_MODEL}, effort=${env.AGENT_EFFORT})`);
  return new ClaudeAgentModel({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.AGENT_MODEL,
    maxTokens: env.AGENT_MAX_TOKENS,
    effort: env.AGENT_EFFORT,
  });
}
