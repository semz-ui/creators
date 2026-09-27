/**
 * The slice of the video module the agent needs. Deliberately narrow and
 * expressed in the agent's own types so the domain stays free of cross-module
 * imports; the adapter in `infrastructure/` maps to the real use cases.
 */
export interface AgentVideo {
  id: string;
  status: string;
  prompt: string;
  durationSeconds: number;
  resultUrl: string | null;
  error: string | null;
  createdAt: Date;
}

export interface AgentGenerateVideoInput {
  prompt: string;
  durationSeconds: number;
  musicTrackId?: string | null;
  narrationText?: string | null;
  narrationVoice?: string | null;
}

export interface IVideoActions {
  generate(userId: string, input: AgentGenerateVideoInput): Promise<AgentVideo>;
  /** Refreshes generation state before reading, like `GET /videos/:id` does. */
  get(userId: string, videoId: string): Promise<AgentVideo>;
  list(userId: string, options: { page: number; limit: number }): Promise<AgentVideo[]>;
}
