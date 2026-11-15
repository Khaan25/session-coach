#!/usr/bin/env node
// Runs the given unit test files with each package's own runner, every package at once.
//
//   node scripts/run-tests.mjs apps/web/src/lib/review/grade.test.ts packages/cli/src/push.test.ts
//   node scripts/run-tests.mjs --affected origin/main     only the tests that diff reaches (scripts/affected.mjs)
//
// With no files and no --affected, it runs nothing and says so: CI passes the list scripts/affected.mjs produced.

import { spawn } from "node:child_process";
import { relative, resolve } from "node:path";

import { affected, changedSince, UNIT_SUITES } from "./affected.mjs";

const ROOT = resolve(import.meta.dirname, "..");

let files = process.argv.slice(2);
if (files[0] === "--affected") {
  if (!files[1]) {
    console.error("usage: node scripts/run-tests.mjs --affected <base ref>");
    process.exit(2);
  }
  files = affected(changedSince(files[1])).unit;
}

if (files.length === 0) {
  console.log("No unit test reaches this diff.");
  process.exit(0);
}

const runs = UNIT_SUITES.map((suite) => ({
  dir: suite.dir,
  files: files.filter(suite.match).map((f) => relative(suite.dir, f)),
})).filter((r) => r.files.length > 0);

const results = await Promise.all(
  runs.map(
    ({ dir, files: list }) =>
      new Promise((done) => {
        let out = "";
        const child = spawn(process.execPath, ["--test", "--experimental-strip-types", ...list], {
          cwd: resolve(ROOT, dir),
          env: process.env,
        });
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("close", (code) => done({ dir, code, out, count: list.length }));
      }),
  ),
);

// Print each package's output in one block so parallel runs don't interleave.
for (const { dir, code, out, count } of results) {
  console.log(
    `\n── ${dir} (${count} file${count === 1 ? "" : "s"}) ${code === 0 ? "passed" : "FAILED"}`,
  );
  console.log(out.trimEnd());
}
process.exit(results.some((r) => r.code !== 0) ? 1 : 0);
