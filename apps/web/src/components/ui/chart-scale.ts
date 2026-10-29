// The chart's tick arithmetic, apart from React. Ported from the design system's chart-scale.ts.
// shortcut: only niceScale is ported (Timeline needs it); port formatCompact, unitFormat and the path helpers when a chart needs them.

/** Ticks at 1, 2, 2.5 or 5 times a power of ten, covering [min, max]. A reversed extent is read the right way round. */
function niceScale(min: number, max: number, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min > max) [min, max] = [max, min];
  count = Math.max(1, Math.round(count) || 1);
  if (min === max) {
    max = min === 0 ? 1 : min + Math.abs(min);
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toPrecision(12)));
  return { min: lo, max: hi, ticks };
}

export { niceScale };
