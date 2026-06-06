// Fixed locale + UTC so formatted timestamps are deterministic across
// environments (local vs CI) — and unambiguous for the user.
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** Format an ISO timestamp as a stable, UTC date-time string. */
export function formatDateTime(iso: string): string {
  return DATE_TIME_FORMAT.format(new Date(iso));
}
