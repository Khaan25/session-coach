// Full-page screenshots of every route at desktop and phone width, light and dark, for before/after comparisons in a PR.
// Skipped unless SCREENS is set to an output folder: `SCREENS=/tmp/shots pnpm --filter web exec playwright test e2e/screens.spec.ts`.
// Creates its own learner with one ready session and two cards on the LOCAL stack, and deletes the learner at the end.

import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { localStack } from "../tests/local-stack.ts";

const out = process.env.SCREENS ?? "";
test.skip(!out, "set SCREENS to an output folder");

const stack = localStack();
const admin = createClient(stack.url, stack.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `e2e-${randomUUID()}@example.test`;
const password = randomUUID();
const sessionId = randomUUID();
let userId = "";
let cardId = "";

const PUBLIC = [
  "/",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/terms",
  "/support",
  "/delete-account",
  "/login",
  "/sign-up",
  "/sign-up/check-email",
  "/forgot-password",
  "/auth/error",
  "/design-system",
  "/canvas",
];
const SIGNED_IN = () => [
  "/dashboard",
  "/progress",
  "/review",
  `/review/${cardId}`,
  `/s/${sessionId}`,
  "/settings",
  "/setup",
  "/tracker",
  "/defend",
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 375, height: 812 },
] as const;
const SCHEMES = ["light", "dark"] as const;

test.setTimeout(600_000);

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Sam Rivera" },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const session = await admin.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    external_id: "screens",
    raw_path: `${userId}/screens`,
    status: "ready",
  });
  if (session.error) throw session.error;
  const cards = await admin
    .from("decision_cards")
    .insert(
      [
        ["Gzip the session log before upload", "Why gzip the log before upload?"],
        ["Keep scores server-side", "Why does the server write scores, not the learner?"],
      ].map(([decision, question], position) => ({
        session_id: sessionId,
        user_id: userId,
        position,
        decision,
        why: "Stated in the session.",
        source: "stated",
        evidence: [{ event_index: 1, quote: "we decided this", verified: true }],
        question,
        model_answer: "Because the session said so, for a stated reason.",
      })),
    )
    .select("id");
  if (cards.error) throw cards.error;
  cardId = cards.data[0].id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

/** Shoots one route in every viewport and colour scheme. Names are path-safe: `/s/<id>` becomes `s-id`. */
async function shoot(page: Page, path: string) {
  const name =
    path === "/"
      ? "home"
      : path
          .slice(1)
          .replace(/[0-9a-f-]{36}/, "id")
          .replaceAll("/", "-");
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.screenshot({
        path: join(out, `${name}.${viewport.name}.${scheme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
}

test("public routes", async ({ page }) => {
  for (const path of PUBLIC) await shoot(page, path);
});

test("signed-in routes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/);
  for (const path of SIGNED_IN()) await shoot(page, path);
});
