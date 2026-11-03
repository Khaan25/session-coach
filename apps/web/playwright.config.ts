// Browser smoke test against the LOCAL Supabase stack: `pnpm test:e2e` (needs `supabase start` and
// `pnpm exec playwright install chromium`, so not in `pnpm test`; CI runs it in its own e2e job). The dev server gets the local stack's URL
// and keys from `supabase status` here, overriding apps/web/.env.local, and grades with the fake model.

import { defineConfig, devices } from "@playwright/test";

import { localStack } from "./tests/local-stack.ts";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const stack = localStack();

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  // CI runs `next dev` cold on a 2-core runner: the first sign-in compiles /dashboard, which outlasts the 5 s default
  // while other workers compile too. One worker and a longer wait there; the assertions are the same.
  workers: process.env.CI ? 1 : undefined,
  expect: { timeout: process.env.CI ? 30_000 : 5_000 },
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: stack.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: stack.serviceKey,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      MODEL_PROVIDER: "fake",
      // Empty: keep test sign-ins out of the live rate-limit store.
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
    },
  },
});
