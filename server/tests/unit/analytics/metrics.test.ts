import { Metrics } from '@modules/analytics/domain/metrics';

describe('Metrics', () => {
  it('sums field-wise', () => {
    const a = Metrics.of({ views: 100, likes: 10, comments: 2, shares: 1 });
    const b = Metrics.of({ views: 50, likes: 5, comments: 3, shares: 4 });
    expect(a.add(b).toValues()).toEqual({ views: 150, likes: 15, comments: 5, shares: 5 });
  });

  it('zero is the additive identity', () => {
    const a = Metrics.of({ views: 7, likes: 1, comments: 0, shares: 2 });
    expect(Metrics.zero().add(a).toValues()).toEqual(a.toValues());
  });

  it('rejects negative or non-integer values', () => {
    expect(() => Metrics.of({ views: -1, likes: 0, comments: 0, shares: 0 })).toThrow();
    expect(() => Metrics.of({ views: 1.5, likes: 0, comments: 0, shares: 0 })).toThrow();
  });
});
