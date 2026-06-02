const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/**
 * Convert a duration string to seconds. Accepts `<n><unit>` where unit is one
 * of s/m/h/d (e.g. "15m", "7d"), or a bare number treated as seconds ("3600").
 * Throws on anything else so misconfiguration fails fast.
 */
export function durationToSeconds(value: string): number {
  const trimmed = value.trim();

  const match = /^(\d+)([smhd])$/.exec(trimmed);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2] as keyof typeof UNIT_SECONDS;
    return amount * UNIT_SECONDS[unit]!;
  }

  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return Math.floor(asSeconds);
  }

  throw new Error(`Invalid duration: "${value}"`);
}
