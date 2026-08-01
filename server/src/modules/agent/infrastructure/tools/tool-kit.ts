import type { ZodType } from 'zod';

import { ValidationError } from '@shared/domain/errors';

/**
 * Validates model-supplied tool input. Failures become an error `tool_result`
 * (see `AgentLoop.executeTool`), so the message is written for the model to
 * read and correct on its next attempt.
 */
export function parseToolInput<T>(schema: ZodType<T>, input: unknown, toolName: string): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
    .join('; ');
  throw new ValidationError(`Invalid input for "${toolName}" — ${issues}`);
}

/** Serializes a tool result for the model. */
export function toolJson(value: unknown): string {
  return JSON.stringify(value);
}
