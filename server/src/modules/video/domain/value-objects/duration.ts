import { InvalidDurationError } from '../video.errors';

export const DURATION_MIN_SECONDS = 5;
export const DURATION_MAX_SECONDS = 60;

/** Requested video length in whole seconds, bounded to the supported range. */
export class Duration {
  private constructor(public readonly seconds: number) {}

  static create(raw: number): Duration {
    if (!Number.isInteger(raw)) {
      throw new InvalidDurationError('Duration must be a whole number of seconds');
    }
    if (raw < DURATION_MIN_SECONDS || raw > DURATION_MAX_SECONDS) {
      throw new InvalidDurationError(
        `Duration must be between ${DURATION_MIN_SECONDS} and ${DURATION_MAX_SECONDS} seconds`,
      );
    }
    return new Duration(raw);
  }
}
