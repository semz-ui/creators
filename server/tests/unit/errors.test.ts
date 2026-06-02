import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '@shared/domain/errors';

describe('domain errors', () => {
  const cases: Array<[new (msg: string) => AppError, number, string]> = [
    [NotFoundError, 404, 'NOT_FOUND'],
    [UnauthorizedError, 401, 'UNAUTHORIZED'],
    [ForbiddenError, 403, 'FORBIDDEN'],
    [ConflictError, 409, 'CONFLICT'],
    [TooManyRequestsError, 429, 'TOO_MANY_REQUESTS'],
  ];

  it.each(cases)('%p has the right statusCode and code', (Ctor, statusCode, code) => {
    const err = new Ctor('boom');

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(code);
    expect(err.name).toBe(Ctor.name);
  });

  it('ValidationError carries optional details', () => {
    const details = [{ path: 'email', message: 'invalid' }];
    const err = new ValidationError('bad input', details);

    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });

  it('ValidationError details default to undefined', () => {
    expect(new ValidationError('bad').details).toBeUndefined();
  });
});
