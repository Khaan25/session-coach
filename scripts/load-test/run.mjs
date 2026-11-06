#!/usr/bin/env node
// Database load test: the app's real queries against the real schema at 1x, 10x, 100x and 1000x the data, timed
// before and after a fix migration. See scripts/load-test/README.md.
//
//   node scripts/load-test/run.mjs --fix supabase/migrations/<fix>.sql            every tier, before and after
//   node scripts/load-test/run.mjs --tiers 1,10 --phase before                     baseline only
//   node scripts/load-test/run.mjs --fix <file> --phase after                      after, on databases kept from a before run
//
// It starts its own throwaway Postgres (initdb into --data-dir, port --port, 127.0.0.1 only), never the local Supabase
// stack or the live project. Needs Postgres 17 binaries on PATH or in PG_BIN.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

const { values: args } = parseArgs({
  options: {
    tiers: { type: "string", default: "1,10,100,1000" },
    phase: { type: "string", default: "both" }, // before | after | both
    fix: { type: "string", multiple: true, default: [] },
    "data-dir": { type: "string", default: join(tmpdir(), "session-coach-load-test") },
    port: { type: "string", default: "54399" },
    out: { type: "string", default: join(HERE, "out") },
    "max-samples": { type: "string", default: "50" },
    "min-samples": { type: "string", default: "8" },
    "budget-ms": { type: "string", default: "8000" },
    keep: { type: "boolean", default: false }, // leave the cluster running
  },
});
if (!["before", "after", "both"].includes(args.phase))
  throw new Error(`--phase is before, after or both`);
const tiers = args.tiers.split(",").map(Number);
const fixes = args.fix.map((f) => resolve(f));
const fixNames = new Set(fixes.map((f) => basename(f)));
if (args.phase !== "before" && fixes.length === 0)
  throw new Error("--phase after needs --fix <migration>");

const bin = (name) => (process.env.PG_BIN ? join(process.env.PG_BIN, name) : name);
// Postgres refuses to start from a multithreaded parent without a valid locale.
const env = {
  ...process.env,
  LC_ALL: "C",
  LANG: "C",
  PGHOST: "127.0.0.1",
  PGPORT: args.port,
  PGUSER: "postgres",
};
const run = (cmd, argv, opts = {}) =>
  execFileSync(bin(cmd), argv, { env, encoding: "utf8", maxBuffer: 1 << 30, ...opts });
const psql = (db, argv) => run("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db, ...argv]);
const sql = (db, text) => psql(db, ["-At", "-c", text]).trim();
const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

function startCluster() {
  const data = args["data-dir"];
  if (!existsSync(join(data, "PG_VERSION"))) {
    log(`initdb ${data}`);
    run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-locale"]);
  }
  if (spawnSync(bin("pg_ctl"), ["-D", data, "status"], { env }).status === 0) return;
  // Durability is off: the data is disposable, and seeding 1000x is mostly WAL otherwise.
  const conf = [
    `-p ${args.port}`,
    "-k ''",
    "-c listen_addresses=127.0.0.1",
    "-c shared_buffers=4GB",
    "-c work_mem=16MB",
    "-c maintenance_work_mem=1GB",
    "-c max_wal_size=16GB",
    "-c fsync=off",
    "-c synchronous_commit=off",
    "-c full_page_writes=off",
    "-c jit=off",
  ].join(" ");
  run("pg_ctl", ["-D", data, "-o", conf, "-l", join(data, "server.log"), "-w", "start"]);
}

const dbExists = (db) =>
  sql("postgres", `select count(*) from pg_database where datname = '${db}'`) === "1";

/** The template: Supabase shim, then every migration except the fixes under test. */
function buildTemplate() {
  if (dbExists("lt_template")) return;
  log("template: shim + migrations");
  sql("postgres", "create database lt_template");
  psql("lt_template", ["-f", join(HERE, "shim.sql")]);
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (!fixNames.has(file)) psql("lt_template", ["-f", join(MIGRATIONS, file)]);
  }
}

function bench(db, tier, phase) {
  log(`${db} ${phase}: timing`);
  sql(
    db,
    `delete from lt_results where tier = ${tier} and phase = '${phase}'; delete from lt_plans where tier = ${tier} and phase = '${phase}'`,
  );
  psql(
    db,
    [
      "-c",
      `call lt_run(${tier}, '${phase}', ${args["max-samples"]}, ${args["min-samples"]}, ${args["budget-ms"]})`,
    ],
    {
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
}

startCluster();
buildTemplate();
mkdirSync(args.out, { recursive: true });

for (const tier of tiers) {
  const db = `lt_${tier}`;
  if (args.phase !== "after") {
    if (dbExists(db)) sql("postgres", `drop database ${db}`);
    sql("postgres", `create database ${db} template lt_template`);
    log(`${db}: seeding at ${tier}x`);
    const t0 = Date.now();
    psql(db, ["-v", `scale=${tier}`, "-f", join(HERE, "seed.sql")]);
    log(`${db}: seeded in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    psql(db, ["-f", join(HERE, "bench.sql")]);
    bench(db, tier, "before");
  }
  if (args.phase !== "before") {
    if (!dbExists(db)) throw new Error(`${db} doesn't exist: run --phase before first`);
    for (const fix of fixes) {
      log(`${db}: applying ${basename(fix)}`);
      psql(db, ["-f", fix]);
    }
    sql(db, "analyze");
    bench(db, tier, "after");
  }
  const counts = sql(
    db,
    `select json_object_agg(relname, n_live_tup) from pg_stat_user_tables where schemaname = 'public'`,
  );
  const results = sql(
    db,
    `select coalesce(json_agg(r), '[]') from lt_results r where tier = ${tier}`,
  );
  const plans = sql(db, `select coalesce(json_agg(p), '[]') from lt_plans p where tier = ${tier}`);
  const queries = sql(db, `select json_agg(q order by name) from lt_queries q`);
  writeFileSync(
    join(args.out, `tier-${tier}.json`),
    JSON.stringify({
      tier,
      counts: JSON.parse(counts),
      queries: JSON.parse(queries),
      results: JSON.parse(results),
      plans: JSON.parse(plans),
    }),
  );
  log(`${db}: wrote ${join(args.out, `tier-${tier}.json`)}`);
}

if (!args.keep) run("pg_ctl", ["-D", args["data-dir"], "-m", "fast", "stop"]);
log("done. Report: node scripts/load-test/report.mjs");
