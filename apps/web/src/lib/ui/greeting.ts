/**
 * Today's greeting: the part of the learner's day, and their first name when they set one ("Evening, Sam").
 *
 * @param name - The display name, if the learner set one.
 * @param timeZone - The learner's `profiles.timezone`.
 * @param now - The current time, read by the page.
 */
export function greeting(name: string | null | undefined, timeZone: string, now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  let part = "Evening";
  if (hour >= 5 && hour < 12) {
    part = "Morning";
  } else if (hour >= 12 && hour < 18) {
    part = "Afternoon";
  }
  const first = name?.trim().split(/\s+/u)[0];
  return first ? `${part}, ${first}` : part;
}
