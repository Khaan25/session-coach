#!/usr/bin/env node
// Turns the load test's raw samples (out/tier-*.json from run.mjs) into summary.json and a self-contained report.html.
//
//   node scripts/load-test/report.mjs [--out scripts/load-test/out]

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { benjaminiHochberg, mannWhitney, median, medianCI, quantile, speedupCI } from "./stats.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: { out: { type: "string", default: join(HERE, "out") } },
});

// Supabase's statement_timeout for the authenticated role, and Vercel's function limit for the cron.
const STATEMENT_TIMEOUT_MS = 8000;
const FUNCTION_LIMIT_MS = 300_000;
// Fixed budgets, so a verdict means the same thing at every tier.
const verdict = (p95, maxPage) =>
  maxPage >= STATEMENT_TIMEOUT_MS ? "fails" : p95 >= 1000 ? "at risk" : p95 >= 100 ? "slow" : "ok";

const files = readdirSync(args.out).filter((f) => /^tier-\d+\.json$/.test(f));
const tiers = files
  .map((f) => JSON.parse(readFileSync(join(args.out, f), "utf8")))
  .sort((a, b) => a.tier - b.tier);
if (tiers.length === 0) throw new Error(`No tier-*.json in ${args.out}. Run run.mjs first.`);

/** The scan nodes of a plan, so the report can say how each table was read. */
function scans(node, acc = []) {
  if (/Scan$/.test(node["Node Type"]) && node["Relation Name"]) {
    acc.push({
      node: node["Node Type"],
      table: node["Relation Name"],
      index: node["Index Name"] ?? null,
      rows: node["Actual Rows"] * (node["Actual Loops"] ?? 1),
      removed: (node["Rows Removed by Filter"] ?? 0) * (node["Actual Loops"] ?? 1),
    });
  }
  for (const child of node.Plans ?? []) scans(child, acc);
  return acc;
}

const cells = [];
for (const t of tiers) {
  const groups = new Map();
  for (const r of t.results) {
    const key = `${r.query}|${r.persona}|${r.phase}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const [key, rows] of groups) {
    const [query, persona, phase] = key.split("|");
    const ms = rows.map((r) => r.ms);
    const maxPage = Math.max(...rows.map((r) => r.max_page_ms));
    const p95 = quantile(ms, 0.95);
    const plan = t.plans.find(
      (p) => p.query === query && p.persona === persona && p.phase === phase,
    )?.plan?.[0];
    cells.push({
      tier: t.tier,
      query,
      persona,
      phase,
      n: ms.length,
      ms,
      median: median(ms),
      ci: medianCI(ms),
      p95,
      maxPage,
      pages: Math.max(...rows.map((r) => r.pages)),
      rows: Math.max(...rows.map((r) => Number(r.rows))),
      verdict: verdict(p95, maxPage),
      scans: plan ? scans(plan.Plan) : [],
      triggerMs: plan?.Triggers ? plan.Triggers.reduce((s, x) => s + x.Time, 0) : null,
    });
  }
}

const find = (tier, query, persona, phase) =>
  cells.find(
    (c) => c.tier === tier && c.query === query && c.persona === persona && c.phase === phase,
  );

// Before vs after for every query, persona and tier that has both, Benjamini-Hochberg-adjusted over the whole family.
const comparisons = [];
for (const b of cells.filter((c) => c.phase === "before")) {
  const a = find(b.tier, b.query, b.persona, "after");
  if (!a) continue;
  const { p, effect } = mannWhitney(b.ms, a.ms);
  comparisons.push({
    tier: b.tier,
    query: b.query,
    persona: b.persona,
    p,
    effect,
    speedup: b.median / a.median,
    speedupCI: speedupCI(b.ms, a.ms),
  });
}
benjaminiHochberg(comparisons.map((c) => c.p)).forEach((q, i) => (comparisons[i].q = q));

// The whole daily-review cron, projected: one profiles read, then one chunk of three reads per 100 learners with
// reminders on (chunks run one after another). Medians of the measured chunk times; the typical learner's chunk.
const cron = [];
for (const t of tiers) {
  const learners = t.counts.profiles ?? 0;
  const chunks = Math.ceil((learners * 0.8) / 100);
  for (const phase of ["before", "after"]) {
    const parts = ["cron.reviews", "cron.new_cards", "cron.answers"].map((q) =>
      find(t.tier, q, "typical", phase),
    );
    const profiles = find(t.tier, "cron.profiles", "typical", phase);
    if (!profiles || parts.some((p) => !p)) continue;
    const ms = profiles.median + chunks * parts.reduce((s, p) => s + p.median, 0);
    cron.push({ tier: t.tier, phase, chunks, ms, overLimit: ms >= FUNCTION_LIMIT_MS });
  }
}

const queries = tiers
  .at(-1)
  .queries.map(({ name, source, role, kind }) => ({ name, source, role, kind }));
const summary = {
  generatedAt: new Date().toISOString(),
  tiers: tiers.map((t) => ({ tier: t.tier, counts: t.counts })),
  queries,
  cells: cells.map(({ ms, ...c }) => c),
  comparisons,
  cron,
  thresholds: {
    slowMs: 100,
    atRiskMs: 1000,
    statementTimeoutMs: STATEMENT_TIMEOUT_MS,
    functionLimitMs: FUNCTION_LIMIT_MS,
  },
};
writeFileSync(join(args.out, "summary.json"), JSON.stringify(summary, null, 1));

const template = readFileSync(join(HERE, "report.template.html"), "utf8");
// JSON inside a <script> block: escape "<" so a value can never close the tag.
const data = JSON.stringify(summary).replace(/</g, "\\u003c");
writeFileSync(join(args.out, "report.html"), template.replace("/*__DATA__*/null", data));
console.log(`Wrote ${join(args.out, "summary.json")} and ${join(args.out, "report.html")}`);
