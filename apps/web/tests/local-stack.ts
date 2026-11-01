// The local Supabase stack's URL and keys, read from `supabase status`, for tests that need a real database.
// Never reads an env file, so these tests can't reach the live project by accident.

import { execFileSync } from "node:child_process";

export type LocalStack = { url: string; anonKey: string; serviceKey: string };

/**
 * Reads the running local stack from the Supabase CLI, which finds supabase/config.toml from any folder in the repo.
 *
 * @returns The API URL and the local demo anon and service-role keys.
 * @throws When the stack isn't running or its URL isn't on this machine.
 */
export function localStack(): LocalStack {
  let status: Record<string, string>;
  try {
    status = JSON.parse(
      execFileSync("supabase", ["status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    throw new Error("The local Supabase stack isn't running. Start it with `supabase start`.");
  }
  const url = status.API_URL;
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error(`supabase status returned ${url}, which isn't local. Refusing to run.`);
  return { url, anonKey: status.ANON_KEY, serviceKey: status.SERVICE_ROLE_KEY };
}
