import type { IAgentTool, IAgentToolRegistry } from '../../domain/ports/agent-tool';

/**
 * Fixed set of tools, keyed by name. The order is stable so the tool list sent
 * to the model is byte-identical between requests — a changing tool list
 * invalidates the prompt cache.
 */
export class StaticAgentToolRegistry implements IAgentToolRegistry {
  private readonly byName: Map<string, IAgentTool>;

  constructor(private readonly tools: IAgentTool[]) {
    this.byName = new Map(tools.map((tool) => [tool.spec.name, tool]));
  }

  list(): IAgentTool[] {
    return this.tools;
  }

  get(name: string): IAgentTool | undefined {
    return this.byName.get(name);
  }
}
