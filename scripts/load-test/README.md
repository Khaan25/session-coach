# Database load test

Runs the app's real queries against the real schema with 1x, 10x, 100x and 1000x the data, before and after a fix
migration, and reports which ones stop scaling. Results and the reasoning behind the last fix: [docs/LOAD_TEST.md](../../docs/LOAD_TEST.md).

```bash
pnpm db:load-test
open scripts/load-test/out/report.html
```

A full run takes about 40 minutes, most of it timing the 1000x tier (3M cards, 4M answers, about 5 GB on disk). Try
it small first:

```bash
node scripts/load-test/run.mjs --tiers 1,10 --fix supabase/migrations/20261106000000_scale_indexes.sql && node scripts/load-test/report.mjs
```

## What it needs

Postgres 17 binaries (`initdb`, `pg_ctl`, `psql`) on `PATH`, or `PG_BIN=/opt/homebrew/opt/postgresql@17/bin`. It
starts its own cluster in `$TMPDIR/session-coach-load-test` on `127.0.0.1:54399` and stops it at the end (`--keep`
leaves it running). It never touches the local Supabase stack or the live project, and needs no env file.

## Files

| File         | Does                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `shim.sql`   | The Supabase parts the migrations expect: API roles, `auth.users`, `auth.uid()`, default grants                     |
| `seed.sql`   | Learners, sessions, cards, reviews, answers, defenses at `-v scale=k` (deterministic)                               |
| `bench.sql`  | The queries (`lt_queries`), their parameters and the timing procedure `lt_run`                                      |
| `run.mjs`    | Builds the template from the migrations, seeds each tier, times before, applies `--fix`, times after                |
| `stats.mjs`  | Bootstrap intervals, Mann-Whitney U, Benjamini-Hochberg correction (`node --test scripts/load-test/stats.test.mjs`) |
| `report.mjs` | `out/summary.json` and `out/report.html` from the raw samples                                                       |

## Adding a query

Add a row to `lt_queries` in `bench.sql`: the SQL PostgREST builds for the supabase-js call (embeds as lateral joins,
`!inner` as an inner join), the role it runs as, and `select`, `paged` (a `fetchAll` read) or `write` (rolled back).
Placeholders: `{uid}`, `{repo}`, `{session_id}`, `{ready_ids}`, `{slug}`, `{ids}` (a 100-learner chunk) and
`{shown_repos}`.

## Flags

`--tiers 1,10,100,1000` · `--phase before|after|both` (after reuses the databases a before run kept with `--keep`) ·
`--fix <migration>` (repeatable; left out of the template, applied between the phases) · `--max-samples 50` ·
`--min-samples 8` · `--budget-ms 8000` (time per query and learner) · `--out scripts/load-test/out`.
