/** ISO timestamp for `days` days before now (used for server-side report windows). */
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}
