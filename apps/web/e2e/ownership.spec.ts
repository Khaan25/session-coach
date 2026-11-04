// Dashboard ownership meter and project filter: a learner with sessions in two repos sees the counts from
// `learner_ownership()`, one row per repo, and a repo's link filters the session list. Creates its own learner on the
// LOCAL stack and deletes it at the end (rows cascade).

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
let userId = "";

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  // session-coach: 2 cards, one answered 2 and mastered. rapporteur: 1 card, answered 1.
  const plan = [
    { repo: "session-coach", title: "Add rate limiting", cards: [2, null] },
    { repo: "rapporteur", title: "Stream the report export", cards: [1] },
  ];
  for (const [i, { repo, title, cards }] of plan.entries()) {
    const sessionId = randomUUID();
    const session = await admin.from("sessions").insert({
      id: sessionId,
      user_id: userId,
      external_id: `e2e-ownership-${i}`,
      raw_path: `${userId}/e2e-ownership-${i}`,
      status: "ready",
      title,
      repo,
    });
    if (session.error) throw session.error;
    for (const [position, score] of cards.entries()) {
      const card = await admin
        .from("decision_cards")
        .insert({
          session_id: sessionId,
          user_id: userId,
          position,
          decision: `${repo} decision ${position}`,
          why: "why",
          source: "stated",
          evidence: [{ event_index: 1, quote: "q", verified: true }],
          question: `${repo} question ${position}?`,
          model_answer: "answer",
        })
        .select("id")
        .single();
      if (card.error) throw card.error;
      if (score === null) continue;
      const answer = await admin
        .from("answers")
        .insert({ card_id: card.data.id, user_id: userId, review_step: 0, answer: "a", score });
      if (answer.error) throw answer.error;
      if (score === 2) {
        const review = await admin
          .from("reviews")
          .insert({
            card_id: card.data.id,
            user_id: userId,
            step: 3,
            mastered: true,
            due_on: null,
          });
        if (review.error) throw review.error;
      }
    }
  }
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("the dashboard shows ownership per repo and filters sessions by project", async ({ page }) => {
  await page.goto("/login");
  // The Suspense fallback form and the real one are both in the page for a moment while it streams.
  await expect(page.getByLabel("Email")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(
    page.getByRole("heading", { name: "Explained 1 · owned 1 of 3 decisions" }),
  ).toBeVisible();
  await expect(page.getByText("Explained 1 · owned 1 of 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Explained 0 · owned 0 of 1", { exact: true })).toBeVisible();

  // The project filter above the session list, not the sidebar's session links.
  await page
    .getByRole("navigation", { name: "Projects" })
    .getByRole("link", { name: "rapporteur", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\?repo=rapporteur$/);
  const list = page
    .getByRole("main")
    .getByRole("heading", { name: "Sessions" })
    .locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(list.getByText("Stream the report export")).toBeVisible();
  await expect(list.getByText("Add rate limiting")).toHaveCount(0);
});
