const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

// A fixed locale, so the server and the browser write the same words.
const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/**
 * "3 hours ago", "yesterday", "now". `now` comes from the caller, so a component never reads the clock in render
 * (cacheComponents prerenders it). Unparseable input returns null.
 */
export function formatRelativeTime(iso: string, now: Date): string | null {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((then - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "second");
}
