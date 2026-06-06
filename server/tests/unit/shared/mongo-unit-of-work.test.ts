import mongoose from 'mongoose';

import { logger } from '@shared/infrastructure/logging/logger';
import { MongoUnitOfWork } from '@shared/infrastructure/database/mongo-unit-of-work';

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { startSession: jest.fn() },
}));

const startSession = mongoose.startSession as jest.MockedFunction<typeof mongoose.startSession>;

/** A fake session whose `withTransaction` runs (or rejects for) the supplied work. */
function fakeSession(behavior: 'commit' | (() => Promise<never>)) {
  const endSession = jest.fn().mockResolvedValue(undefined);
  const withTransaction = jest.fn(async (cb: () => Promise<unknown>) => {
    if (behavior === 'commit') return cb();
    return behavior();
  });
  return { withTransaction, endSession } as unknown as Awaited<
    ReturnType<typeof mongoose.startSession>
  >;
}

/** Build the standalone "no transactions" server error MongoDB throws. */
function standaloneTxnError() {
  return Object.assign(
    new Error('Transaction numbers are only allowed on a replica set member or mongos'),
    { code: 20, codeName: 'IllegalOperation' },
  );
}

describe('MongoUnitOfWork', () => {
  beforeEach(() => {
    startSession.mockReset();
    jest.spyOn(logger, 'warn').mockImplementation(() => logger);
  });

  afterEach(() => jest.restoreAllMocks());

  it('runs the work inside a transaction and returns its result on a replica set', async () => {
    const session = fakeSession('commit');
    startSession.mockResolvedValue(session);
    const uow = new MongoUnitOfWork();

    const work = jest.fn(async (tx: unknown) => {
      expect(tx).toBe(session); // work receives the session as the tx handle
      return 'ok';
    });
    const result = await uow.run(work);

    expect(result).toBe('ok');
    expect(work).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to a sessionless run when the deployment is a standalone', async () => {
    startSession.mockResolvedValue(fakeSession(() => Promise.reject(standaloneTxnError())));
    const uow = new MongoUnitOfWork();

    const work = jest.fn(async (tx: unknown) => {
      expect(tx).toBeUndefined(); // no session passed on the fallback path
      return 42;
    });
    const result = await uow.run(work);

    expect(result).toBe(42);
    expect(work).toHaveBeenCalledTimes(1); // the failed txn attempt never reached work
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('latches the standalone decision: later calls skip the transaction attempt', async () => {
    startSession
      .mockResolvedValueOnce(fakeSession(() => Promise.reject(standaloneTxnError())))
      .mockImplementation(() => {
        throw new Error('startSession should not be called after latching');
      });
    const uow = new MongoUnitOfWork();

    await uow.run(async () => 'first');
    const second = await uow.run(async (tx) => {
      expect(tx).toBeUndefined();
      return 'second';
    });

    expect(second).toBe('second');
    expect(startSession).toHaveBeenCalledTimes(1); // only the first call opened a session
    expect(logger.warn).toHaveBeenCalledTimes(1); // warned once, not on every call
  });

  it('rethrows unrelated transaction errors instead of silently degrading', async () => {
    const boom = Object.assign(new Error('insufficient credits'), {
      code: 11000,
      codeName: 'DuplicateKey',
    });
    startSession.mockResolvedValue(fakeSession(() => Promise.reject(boom)));
    const uow = new MongoUnitOfWork();

    await expect(uow.run(async () => 'never')).rejects.toThrow('insufficient credits');
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
