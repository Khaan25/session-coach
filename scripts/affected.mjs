#!/usr/bin/env node
// Works out which tests a diff can reach, so a pull request runs only those.
//
//   node scripts/affected.mjs --base origin/main          JSON: { unit: [...files], e2e, rls, reason }
//   node scripts/affected.mjs --base origin/main --github  the same, written to $GITHUB_OUTPUT
//
// Unit tests follow the import graph: a test runs when it imports, directly or through other files, a changed
// .ts/.tsx/.js/.mjs file, or a fixture it reads through `new URL("...", import.meta.url)`. Anything the graph can't
// see runs everything: a changed lockfile, package.json, tsconfig, CI workflow, this script, or a data file
// (.json, .jsonl, .txt…) inside apps/ or packages/ that no test reaches.
// The browser and RLS suites exercise the app through HTTP, not imports, so they are gated by path instead.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// Where each package keeps its unit tests: the same globs as each package's `test` script.
export const UNIT_SUITES = [
  { dir: "apps/web", match: (f) => f.startsWith("apps/web/src/") && f.endsWith(".test.ts") },
  { dir: "packages/cli", match: (f) => /^packages\/cli\/src\/[^/]+\.test\.ts$/.test(f) },
  { dir: "packages/shared", match: (f) => /^packages\/shared\/src\/[^/]+\.test\.ts$/.test(f) },
];

// Changes that can't affect any test.
const INERT = [/^docs\//, /^\.claude-logs\//, /^\.claude\//, /^LICENSE/, /(^|\/)[^/]*\.md$/];
// Changes the graph can't follow: run every suite.
const GLOBAL = [
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /(^|\/)package\.json$/,
  /(^|\/)tsconfig[^/]*\.json$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^scripts\/(affected|shard-by-time|run-tests)\.mjs$/,
  /^\.nvmrc$|^\.node-version$/,
];
const CODE = /\.(ts|tsx|mts|js|mjs)$/;
const DATA = /\.(json|jsonl|ya?ml|txt|csv|sql)$/;

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".content-collections", ".git"]);

function walk(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP_DIRS.has(name)) continue;
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

export function allUnitTests() {
  return UNIT_SUITES.flatMap((s) => walk(s.dir).filter(s.match)).sort();
}

const sharedExports = JSON.parse(
  readFileSync(join(ROOT, "packages/shared/package.json"), "utf8"),
).exports;

function tryFile(base) {
  const stems = [base, base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")];
  const exts = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"];
  for (const stem of stems)
    for (const ext of exts) {
      const p = stem + ext;
      if (existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).isFile()) return p;
    }
  return null;
}

// Resolves an import specifier from `from` (repo-relative) to a repo-relative file, or null for an npm package.
function resolveImport(spec, from) {
  if (spec.startsWith(".")) return tryFile(relative(ROOT, resolve(ROOT, dirname(from), spec)));
  if (spec.startsWith("@/") && from.startsWith("apps/web/"))
    return tryFile(`apps/web/src/${spec.slice(2)}`);
  if (spec.startsWith("@session-coach/shared/")) {
    const target = sharedExports[`./${spec.slice("@session-coach/shared/".length)}`];
    return target ? tryFile(join("packages/shared", target)) : null;
  }
  return null;
}

const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g;

const depsCache = new Map();
function deps(file) {
  if (depsCache.has(file)) return depsCache.get(file);
  const src = readFileSync(join(ROOT, file), "utf8");
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    // `new URL(spec, import.meta.url)` is always relative to the file, even without a leading "./".
    const hit = m[4]
      ? tryFile(relative(ROOT, resolve(ROOT, dirname(file), m[4])))
      : resolveImport(m[1] ?? m[2] ?? m[3], file);
    if (hit) out.push(hit);
  }
  depsCache.set(file, out);
  return out;
}

// Every repo file a test can reach through imports, the test itself included.
export function reach(test) {
  const seen = new Set([test]);
  const stack = [test];
  while (stack.length > 0) {
    const file = stack.pop();
    if (!CODE.test(file)) continue;
    for (const dep of deps(file))
      if (!seen.has(dep)) {
        seen.add(dep);
        stack.push(dep);
      }
  }
  return seen;
}

export function affected(changed) {
  const tests = allUnitTests();
  const live = changed.filter((f) => !INERT.some((re) => re.test(f)));
  const everything = { unit: tests, e2e: true, rls: true };

  const global = live.find((f) => GLOBAL.some((re) => re.test(f)));
  if (global) return { ...everything, reason: `${global} can change every suite` };
  const reaches = new Map(tests.map((t) => [t, reach(t)]));
  const reached = new Set([...reaches.values()].flatMap((r) => [...r]));
  // A data file no test reaches by import or `new URL(..., import.meta.url)` may still be read some other way.
  // Styles, images, fonts and page content can't be read by a unit test; the browser suite covers them.
  const opaque = live.find(
    (f) =>
      /^(apps|packages)\//.test(f) && DATA.test(f) && !reached.has(f) && existsSync(join(ROOT, f)),
  );
  if (opaque)
    return {
      ...everything,
      reason: `no import reaches ${opaque}, so a test may read it some other way`,
    };

  const changedSet = new Set(live);
  const unit = tests.filter((t) => [...reaches.get(t)].some((f) => changedSet.has(f)));

  const isUnitTest = (f) => UNIT_SUITES.some((s) => s.match(f));
  // The browser suite drives the whole app, the CLI included (full-flow spawns it), so any live change outside
  // unit tests reaches it.
  const e2e = live.some((f) => !isUnitTest(f));
  const rls = live.some((f) =>
    /^supabase\/|^apps\/web\/tests\/|^apps\/web\/src\/lib\/supabase\//.test(f),
  );
  const reason =
    live.length === 0 ? "only docs or logs changed" : `${live.length} changed file(s) traced`;
  return { unit, e2e, rls, reason };
}

export function changedSince(base) {
  const mergeBase = execFileSync("git", ["merge-base", base, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return execFileSync("git", ["diff", "--name-only", mergeBase, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const base = args[args.indexOf("--base") + 1];
  if (!args.includes("--base") || !base) {
    console.error("usage: node scripts/affected.mjs --base <ref> [--github]");
    process.exit(2);
  }
  const result = affected(changedSince(base));
  if (args.includes("--github")) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `unit=${result.unit.join(" ")}\ne2e=${result.e2e}\nrls=${result.rls}\n`,
    );
    const total = allUnitTests().length;
    console.log(
      `${result.reason}: ${result.unit.length}/${total} unit test files, e2e=${result.e2e}, rls=${result.rls}`,
    );
    for (const f of result.unit) console.log(`  ${f}`);
  } else console.log(JSON.stringify(result, null, 2));
}
