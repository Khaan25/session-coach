// Answer first on /s/[id]: an unanswered card shows only its decision, question and answer box, and its why is not in
// the page at all. "I don't know yet" reveals the why, scores 0, and the card comes back tomorrow.
// Creates its own throwaway learner and session on the LOCAL stack and deletes the learner at the end (rows cascade).

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
const why = `Learners behind one office IP would block each other (${randomUUID().slice(0, 8)}).`;
const question = "Why is the limit keyed on the token rather than the IP?";
let userId = "";
let sessionId = "";
let cardId = "";

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  sessionId = randomUUID();
  const session = await admin.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    external_id: "e2e-answer-first",
    raw_path: `${userId}/e2e-answer-first`,
    status: "ready",
    title: "Add rate limiting",
  });
  if (session.error) throw session.error;
  const card = await admin
    .from("decision_cards")
    .insert({
      session_id: sessionId,
      user_id: userId,
      position: 0,
      decision: "Rate limit uploads per token, not per IP",
      why,
      source: "stated",
      evidence: [{ event_index: 1, quote: "key it on the token", verified: true }],
      question,
      model_answer: "A shared IP would block every learner behind it; the token names one learner.",
    })
    .select("id")
    .single();
  if (card.error) throw card.error;
  cardId = card.data.id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("an unanswered card hides its why until the learner says they don't know yet", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const response = await page.goto(`/s/${sessionId}`);
  await expect(page.getByRole("heading", { name: question })).toBeVisible();
  // Not hidden by CSS: the why is nowhere in the HTML or the RSC payload.
  expect(await response!.text()).not.toContain(why);
  expect(await page.content()).not.toContain(why);

  await page.getByRole("button", { name: /I don.t know yet/ }).click();
  await expect(page.getByRole("heading", { name: "Here's the why" })).toBeVisible();
  await expect(page.getByText(why)).toBeVisible();

  const answer = await admin.from("answers").select("answer, score").eq("card_id", cardId).single();
  expect(answer.data).toEqual({ answer: "I don't know yet", score: 0 });
  const review = await admin
    .from("reviews")
    .select("step, mastered")
    .eq("card_id", cardId)
    .single();
  expect(review.data).toEqual({ step: 1, mastered: false });

  // Answered now, so the session page shows the whole card.
  await page.reload();
  await expect(page.getByText(why)).toBeVisible();
});
