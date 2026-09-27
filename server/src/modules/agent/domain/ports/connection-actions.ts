export interface AgentConnection {
  platform: string;
  displayName: string;
  status: string;
}

export interface IConnectionActions {
  list(userId: string): Promise<AgentConnection[]>;
}
