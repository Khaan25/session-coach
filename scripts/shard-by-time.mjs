#!/usr/bin/env node
// Splits test files into shards of equal recorded run time, not equal file count.
//
//   node scripts/shard-by-time.mjs split  --timings <json> --shards 2 --index 1 <files...>   files for shard 1 of 2
//   node scripts/shard-by-time.mjs record --timings <json> <playwright-report.json...>       merge new timings in
//
// Timings are { "<file>": seconds }. `split` puts the slowest file on the shard with the least time so far
// (longest-processing-time first), so one slow spec doesn't leave the other shards idle. A file with no recorded time
// counts as the average of the known ones. `record` reads Playwright JSON reports (one per shard) and replaces each
// file's time with the sum of its tests' durations in the newest report.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

function flag(args, name) {
  const i = args.indexOf(name);
  if (i === -1 || !args[i + 1]) throw new Error(`missing ${name}`);
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}

export function split(files, timings, shards) {
  // Average over the files being split, so times left behind by deleted specs don't skew it.
  const known = files.filter((f) => f in timings).map((f) => timings[f]);
  const fallback = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  const cost = (f) => timings[f] ?? fallback;
  const bins = Array.from({ length: shards }, () => ({ total: 0, files: [] }));
  const order = [...files].sort((a, b) => cost(b) - cost(a) || a.localeCompare(b));
  for (const file of order) {
    const bin = bins.reduce((min, b) => (b.total < min.total ? b : min));
    bin.files.push(file);
    bin.total += cost(file);
  }
  return bins;
}

// Sums test durations per spec file from a Playwright JSON report. Paths come back relative to `testDir`'s parent
// (the Playwright config's directory), matching how specs are passed on the command line.
export function timingsFromReport(report) {
  const out = {};
  const rootDir = report.config?.rootDir ?? "";
  const configDir = report.config?.configFile ? resolve(report.config.configFile, "..") : rootDir;
  const visit = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? [])
        for (const r of t.results ?? []) {
          const file = relative(configDir, resolve(rootDir, spec.file));
          out[file] = (out[file] ?? 0) + r.duration / 1000;
        }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return out;
}

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  const timingsPath = flag(args, "--timings");
  const timings = existsSync(timingsPath) ? JSON.parse(readFileSync(timingsPath, "utf8")) : {};

  if (command === "split") {
    const shards = Number(flag(args, "--shards"));
    const index = Number(flag(args, "--index"));
    const bins = split(args, timings, shards);
    for (const [i, b] of bins.entries())
      console.error(`shard ${i + 1}/${shards}: ~${b.total.toFixed(1)}s  ${b.files.join(" ")}`);
    console.log(bins[index - 1].files.join(" "));
  } else if (command === "record") {
    const merged = { ...timings };
    for (const reportPath of args) {
      if (!existsSync(reportPath)) continue;
      for (const [file, secs] of Object.entries(
        timingsFromReport(JSON.parse(readFileSync(reportPath, "utf8"))),
      ))
        merged[file] = Math.round(secs * 10) / 10;
    }
    const sorted = Object.fromEntries(
      Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(timingsPath, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(`recorded ${Object.keys(sorted).length} file timings in ${timingsPath}`);
  } else {
    console.error("usage: shard-by-time.mjs split|record --timings <json> ...");
    process.exit(2);
  }
}
