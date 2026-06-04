import { InvalidDurationError, InvalidPromptError } from '@modules/video/domain/video.errors';
import { Duration } from '@modules/video/domain/value-objects/duration';
import { Prompt } from '@modules/video/domain/value-objects/prompt';

describe('Prompt', () => {
  it('trims and accepts a valid prompt', () => {
    expect(Prompt.create('  a sunset over the sea  ').value).toBe('a sunset over the sea');
  });

  it('rejects an empty/whitespace prompt', () => {
    expect(() => Prompt.create('   ')).toThrow(InvalidPromptError);
  });

  it('rejects a prompt over 1000 characters', () => {
    expect(() => Prompt.create('a'.repeat(1001))).toThrow(InvalidPromptError);
  });
});

describe('Duration', () => {
  it('accepts a value within range', () => {
    expect(Duration.create(30).seconds).toBe(30);
  });

  it.each([4, 61, 0, -5])('rejects out-of-range value %p', (value) => {
    expect(() => Duration.create(value)).toThrow(InvalidDurationError);
  });

  it('rejects a non-integer', () => {
    expect(() => Duration.create(10.5)).toThrow(InvalidDurationError);
  });
});
