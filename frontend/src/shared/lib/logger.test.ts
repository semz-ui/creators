import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({ isDevelopment: true }));
vi.mock('@/shared/config/env', () => ({
  get isDevelopment() {
    return mockEnv.isDevelopment;
  },
}));

// Imported after the mock so the logger picks up the stubbed flag.
const { logger } = await import('./logger');

describe('logger', () => {
  beforeEach(() => {
    mockEnv.isDevelopment = true;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('formats with timestamp, level, and context', () => {
    logger('Auth').info('signed in');

    expect(console.log).toHaveBeenCalledTimes(1);
    const line = vi.mocked(console.log).mock.calls[0]?.[0];
    expect(line).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] \[INFO\] \[Auth\] signed in$/,
    );
  });

  it('forwards extra args to the console method', () => {
    const err = new Error('boom');
    logger('Api').error('request failed', err, 42);

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] [Api]'), err, 42);
  });

  it('routes each level to the matching console method', () => {
    const log = logger('Ctx');
    log.info('i');
    log.error('e');
    log.warn('w');
    log.debug('d');

    expect(console.log).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.debug).toHaveBeenCalledOnce();
  });

  it('suppresses all output outside development', () => {
    mockEnv.isDevelopment = false;
    const log = logger('Ctx');
    log.info('i');
    log.error('e');
    log.warn('w');
    log.debug('d');

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.debug).not.toHaveBeenCalled();
  });
});
