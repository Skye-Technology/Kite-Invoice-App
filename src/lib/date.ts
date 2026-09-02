/**
 * Adds `days` to an ISO date string (YYYY-MM-DD) and returns an ISO date string.
 * Does all arithmetic in UTC — parsing/adding/formatting in local time would shift the
 * result by a day whenever the local timezone is offset from UTC (e.g. CEST, UTC+2:
 * local midnight is the previous day in UTC, so a naive local calc silently loses a day).
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
