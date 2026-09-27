export interface AgentPublicationTarget {
  platform: string;
  status: string;
  externalPostId: string | null;
  error: string | null;
}

export interface AgentPublication {
  id: string;
  videoId: string;
  status: string;
  caption: string | null;
  scheduledAt: Date | null;
  targets: AgentPublicationTarget[];
}

export interface AgentPublishInput {
  videoId: string;
  /** Platform names; validated by the adapter, which rejects unknown ones. */
  platforms: string[];
  caption?: string;
}

export interface IPublishingActions {
  publish(userId: string, input: AgentPublishInput): Promise<AgentPublication>;
}
