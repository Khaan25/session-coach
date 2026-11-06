// Statistics for the load test: medians with bootstrap intervals, the Mann-Whitney U test for before vs after, and
// the Benjamini-Hochberg correction across every comparison. Timing samples are skewed with long tails, so nothing here assumes a
// normal distribution.

/** A seeded PRNG (mulberry32), so a report recomputed from the same samples prints the same intervals. */
export function rng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The q-quantile (0..1) by linear interpolation. */
export function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}

export const median = (xs) => quantile(xs, 0.5);

const resample = (xs, rand) => xs.map(() => xs[Math.floor(rand() * xs.length)]);

/** 95% percentile-bootstrap interval of the median. */
export function medianCI(xs, { iterations = 2000, seed = 42 } = {}) {
  const rand = rng(seed);
  const meds = Array.from({ length: iterations }, () => median(resample(xs, rand)));
  return [quantile(meds, 0.025), quantile(meds, 0.975)];
}

/** 95% bootstrap interval of median(before) / median(after): the speed-up and how sure it is. */
export function speedupCI(before, after, { iterations = 2000, seed = 42 } = {}) {
  const rand = rng(seed);
  const ratios = Array.from(
    { length: iterations },
    () => median(resample(before, rand)) / median(resample(after, rand)),
  );
  return [quantile(ratios, 0.025), quantile(ratios, 0.975)];
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26 through erf), accurate to about 1e-7. */
function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Two-sided Mann-Whitney U test with the normal approximation, tie-corrected and continuity-corrected.
 *
 * @returns U for `a`, the p-value, and the common-language effect size P(a > b) + P(a = b) / 2.
 */
export function mannWhitney(a, b) {
  const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]);
  const ranks = new Array(all.length);
  let tieTerm = 0;
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++;
    for (let k = i; k <= j; k++) ranks[k] = (i + j) / 2 + 1;
    const t = j - i + 1;
    tieTerm += t ** 3 - t;
    i = j + 1;
  }
  const n1 = a.length;
  const n2 = b.length;
  const n = n1 + n2;
  const r1 = all.reduce((sum, [, group], i) => (group === 0 ? sum + ranks[i] : sum), 0);
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mean = (n1 * n2) / 2;
  const sd = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tieTerm / (n * (n - 1))));
  const p = sd === 0 ? 1 : Math.min(1, 2 * (1 - normalCdf((Math.abs(u - mean) - 0.5) / sd)));
  return { u, p, effect: u / (n1 * n2) };
}

/**
 * Benjamini-Hochberg: adjusted p-values (q-values) in the input order, so "adjusted p < 0.05" keeps the expected share
 * of false discoveries under 5% across the family. Holm's family-wise control would need p < 0.0002 for the first of
 * ~230 tests, which the five samples a minute-long query allows can't reach.
 */
export function benjaminiHochberg(ps) {
  const order = ps.map((p, i) => [p, i]).sort((x, y) => y[0] - x[0]);
  const adjusted = new Array(ps.length);
  let running = 1;
  order.forEach(([p, i], k) => {
    running = Math.min(running, (p * ps.length) / (ps.length - k));
    adjusted[i] = running;
  });
  return adjusted;
}
