// Reads a Quartz token off an element at runtime, for the few timings and lengths that JavaScript has to
// do arithmetic with (toast reading time, skeleton delay, chart layout, a fixed-position menu's height).
// tokens.css stays the one source; the fallback is the token's value and only covers a missing element
// or a server render.

/** A token's value in px or ms: "8px" is 8, "3000ms" is 3000, "3s" is 3000. Anything else gives the fallback. */
export function cssNumber(el: Element | null | undefined, name: string, fallback: number): number {
  if (!el || typeof getComputedStyle === "undefined") return fallback;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const match = raw.match(/^(-?[\d.]+)(px|ms|s)?$/);
  if (!match) return fallback;
  const n = parseFloat(match[1]);
  return match[2] === "s" ? n * 1000 : n;
}
