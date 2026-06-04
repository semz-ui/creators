import { InvalidPromptError } from '../video.errors';

export const PROMPT_MAX_LENGTH = 1000;

/** Generation prompt. Trimmed and length-bounded at the domain boundary. */
export class Prompt {
  private constructor(public readonly value: string) {}

  static create(raw: string): Prompt {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new InvalidPromptError('Prompt is required');
    }
    if (trimmed.length > PROMPT_MAX_LENGTH) {
      throw new InvalidPromptError(`Prompt must be at most ${PROMPT_MAX_LENGTH} characters`);
    }
    return new Prompt(trimmed);
  }
}
