// The chart's tick arithmetic, apart from React. Ported from the design system's chart-scale.ts.
// shortcut: only niceScale is ported (Timeline needs it); port formatCompact, unitFormat and the path helpers when a chart needs them.

/** Ticks at 1, 2, 2.5 or 5 times a power of ten, covering [min, max]. A reversed extent is read the right way round. */
function niceScale(min: number, max: number, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min > max) [min, max] = [max, min];
  count = Math.min(1000, Math.max(1, Math.round(count) || 1));
  if (min === max) {
    max = min === 0 ? 1 : min + Math.abs(min);
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  // By index, not `t += step`: past 2^53 a small step stops advancing t and the loop never ends.
  const last = Math.min(Math.round((hi - lo) / step), 1000);
  const ticks: number[] = [];
  // Rounded to the step's own decimals, so float noise goes but ticks on a large base stay distinct.
  const dp = Math.min(100, Math.max(0, -Math.floor(Math.log10(step)) + 1));
  for (let i = 0; i <= last; i++) ticks.push(Number((lo + i * step).toFixed(dp)));
  return { min: lo, max: hi, ticks };
}

export { niceScale };
