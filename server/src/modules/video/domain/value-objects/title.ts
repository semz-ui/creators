import { InvalidTitleError } from '../video.errors';

export const TITLE_MAX_LENGTH = 200;

/** User-provided title for an uploaded video. Trimmed and length-bounded. */
export class Title {
  private constructor(public readonly value: string) {}

  static create(raw: string): Title {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new InvalidTitleError('Title is required');
    }
    if (trimmed.length > TITLE_MAX_LENGTH) {
      throw new InvalidTitleError(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
    }
    return new Title(trimmed);
  }
}
