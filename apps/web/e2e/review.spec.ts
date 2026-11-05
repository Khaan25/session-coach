// Smoke: sign in with email and password, see the dashboard, open a seeded card from /review, answer it, see a score.
// Creates its own throwaway learner and card on the LOCAL stack and deletes the learner at the end (rows cascade).

import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { localStack } from "../tests/local-stack.ts";

const stack = localStack();
const admin = createClient(stack.url, stack.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `e2e-${randomUUID()}@example.test`;
const password = randomUUID();
const question = `Why gzip the log before upload? (${randomUUID().slice(0, 8)})`;
const modelAnswer =
  "JSONL logs are repetitive text that shrinks several times over, so uploads are faster.";
let userId = "";

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const sessionId = randomUUID();
  const session = await admin.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    external_id: "e2e",
    raw_path: `${userId}/e2e`,
    status: "ready",
  });
  if (session.error) throw session.error;
  const card = await admin.from("decision_cards").insert({
    session_id: sessionId,
    user_id: userId,
    position: 0,
    decision: "Gzip the session log before upload",
    why: "Logs are repetitive text.",
    source: "stated",
    evidence: [{ event_index: 1, quote: "gzip it", verified: true }],
    question,
    model_answer: modelAnswer,
  });
  if (card.error) throw card.error;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("sign in, review a card, get a score", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/review");
  await page.getByRole("link", { name: "Start review" }).click();
  await expect(page.getByRole("heading", { name: question })).toBeVisible();

  // The fake grader scores by word overlap with the model answer, so the model answer itself scores 2.
  await page.getByLabel("Your explanation").fill(modelAnswer);
  await page.getByRole("button", { name: "Submit answer" }).click();

  await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
  await expect(page.getByText("Explained", { exact: true })).toBeVisible();
});
