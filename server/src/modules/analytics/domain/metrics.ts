export interface MetricsValues {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/** Engagement metrics for a post. Non-negative integers; summable. */
export class Metrics {
  private constructor(
    public readonly views: number,
    public readonly likes: number,
    public readonly comments: number,
    public readonly shares: number,
  ) {}

  static of(values: MetricsValues): Metrics {
    for (const value of Object.values(values)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Metric values must be non-negative integers');
      }
    }
    return new Metrics(values.views, values.likes, values.comments, values.shares);
  }

  static zero(): Metrics {
    return new Metrics(0, 0, 0, 0);
  }

  add(other: Metrics): Metrics {
    return new Metrics(
      this.views + other.views,
      this.likes + other.likes,
      this.comments + other.comments,
      this.shares + other.shares,
    );
  }

  toValues(): MetricsValues {
    return { views: this.views, likes: this.likes, comments: this.comments, shares: this.shares };
  }
}
