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
  const abs = Math.abs(seconds);
  const sign = Math.sign(seconds);
  for (const [i, [unit, size]] of UNITS.entries()) {
    if (abs < size) continue;
    // Round the magnitude so past and future match, and step up when rounding reaches the next unit:
    // 59.5 minutes reads "1 hour", not "60 minutes".
    const n = Math.round(abs / size);
    const up = UNITS[i - 1];
    return up && n * size >= up[1] ? format.format(sign, up[0]) : format.format(sign * n, unit);
  }
  return format.format(0, "second");
}
