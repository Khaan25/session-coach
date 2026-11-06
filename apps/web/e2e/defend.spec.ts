// Defend it end to end: a learner with one card answered 2 starts a defense, answers, gets the fake model's follow-up,
// answers it and sees the grade. Paste is refused on the way. Creates its own learner on the LOCAL stack and deletes it.
// Set E2E_SHOTS to a folder to save screenshots for a PR.

import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { localStack } from "../tests/local-stack.ts";

const stack = localStack();
const admin = createClient(stack.url, stack.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `e2e-${randomUUID()}@example.test`;
const password = randomUUID();
const question = `Why key the upload limit on the CLI token? (${randomUUID().slice(0, 8)})`;
const modelAnswer =
  "A shared office IP would block every learner behind it, so the limit follows the CLI token instead.";
let userId = "";

async function shot(page: Page, name: string) {
  if (process.env.E2E_SHOTS)
    await page.screenshot({ path: join(process.env.E2E_SHOTS, `${name}.png`) });
}

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const sessionId = randomUUID();
  const session = await admin.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    external_id: "e2e-defend",
    raw_path: `${userId}/e2e-defend`,
    status: "ready",
    title: "Add rate limiting",
    repo: "session-coach",
  });
  if (session.error) throw session.error;
  const card = await admin
    .from("decision_cards")
    .insert({
      session_id: sessionId,
      user_id: userId,
      position: 0,
      decision: "Rate limit uploads per CLI token, not per IP",
      why: "A shared IP would block everyone behind it.",
      source: "stated",
      evidence: [{ event_index: 1, quote: "key it on the token", verified: true }],
      question,
      model_answer: modelAnswer,
    })
    .select("id")
    .single();
  if (card.error) throw card.error;
  const answer = await admin
    .from("answers")
    .insert({ card_id: card.data.id, user_id: userId, review_step: 0, answer: "a", score: 2 });
  if (answer.error) throw answer.error;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("start a defense, answer, answer the follow-up, see the grade", async ({ page }) => {
  await page.goto("/login");
  // The Suspense fallback form and the real one are both in the page for a moment while it streams.
  await expect(page.getByLabel("Email")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Defend it" }).click();
  // One defendable card: the start button counts them.
  const startButton = page.getByRole("button", { name: "Start: pick one of 1" });
  await expect(startButton).toBeVisible();
  await shot(page, "1-start");
  await startButton.click();

  // The question and a running 3 minute clock from the server.
  await expect(page.getByRole("heading", { name: question })).toBeVisible();
  await expect(page.getByText(/^[23]:\d\d left$/)).toBeVisible();
  // Exact: the timer bar is labelled "1 of 2 · your answer" too.
  const box = page.getByLabel("Your answer", { exact: true });
  // Paste is refused and says why.
  await box.focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "pasted");
    document.activeElement?.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(page.getByText("Paste is off in Defend it.")).toBeVisible();
  await expect(box).toHaveValue("");
  await box.fill(modelAnswer);
  await shot(page, "2-answer");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  // The AI follow-up, with a fresh clock and an empty box.
  await expect(page.getByText("2 of 2 · follow-up", { exact: true })).toBeVisible();
  await expect(box).toHaveValue("");
  await shot(page, "3-follow-up");
  await box.fill(modelAnswer);
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(
    page.getByRole("heading", { name: /^(Defended|Not defended this time)$/ }),
  ).toBeVisible();
  await shot(page, "4-result");
  const defense = await admin
    .from("defenses")
    .select("status, score")
    .eq("user_id", userId)
    .single();
  expect(defense.data?.status).toBe("finished");
  // The label shows only for a 2.
  const defended = page.getByText(/is saved as defended \(timed, follow-up\)\./);
  if (defense.data?.score === 2) await expect(defended).toBeVisible();
  else await expect(defended).toHaveCount(0);
});
