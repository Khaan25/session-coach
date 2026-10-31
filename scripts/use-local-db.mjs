#!/usr/bin/env node
// Points `pnpm dev` at the local Supabase stack instead of the live project.
//
//   node scripts/use-local-db.mjs        write apps/web/.env.development.local from `supabase status`
//   node scripts/use-local-db.mjs --off  delete it, so dev reads apps/web/.env.local (live) again
//
// Next.js loads .env.development.local before .env.local in dev, and the first file to name a key wins,
// so the live keys in .env.local stay untouched and model keys still come from there. The values written are
// the local stack's public demo keys. Start the stack first: `supabase start`.

import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "apps", "web", ".env.development.local");

if (process.argv.includes("--off")) {
  rmSync(FILE, { force: true });
  console.log("Removed apps/web/.env.development.local; pnpm dev uses apps/web/.env.local again.");
  process.exit(0);
}

let status;
try {
  status = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
} catch {
  console.error("The local Supabase stack isn't running. Start it with `supabase start`.");
  process.exit(1);
}

const url = new URL(status.API_URL);
if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
  console.error(`supabase status returned ${status.API_URL}, which isn't local. Nothing written.`);
  process.exit(1);
}

writeFileSync(
  FILE,
  [
    "# Written by scripts/use-local-db.mjs: the LOCAL Supabase stack. Remove with --off.",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
    "# Empty on purpose: keep local sign-ins out of the live rate-limit store.",
    "UPSTASH_REDIS_REST_URL=",
    "UPSTASH_REDIS_REST_TOKEN=",
    "KV_REST_API_URL=",
    "KV_REST_API_TOKEN=",
    "",
  ].join("\n"),
  { mode: 0o600 },
);
console.log(`Wrote apps/web/.env.development.local: pnpm dev now uses ${status.API_URL}.`);
console.log(`Auth emails land in Mailpit: ${status.MAILPIT_URL ?? status.INBUCKET_URL}`);
