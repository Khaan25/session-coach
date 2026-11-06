// Ownership and the project filter: a learner with sessions in two repos sees the counts from `learner_ownership()` as
// Today's habit line and as one row per repo on /progress, and a repo's link narrows /progress, its sessions included. Creates its own learner on the
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
        const review = await admin.from("reviews").insert({
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

test("Today shows what the learner owns, and /progress splits it per repo", async ({ page }) => {
  await page.goto("/login");
  // The Suspense fallback form and the real one are both in the page for a moment while it streams.
  await expect(page.getByLabel("Email")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Today keeps one quiet line of the overall counts; the per-repo rows moved to /progress (DECISIONS, 2026-11-06).
  await expect(page.getByText("You own 1 of 3 decisions · 1 explained")).toBeVisible();
  // The link's target, then a direct visit: a click during /progress's cold compile can outlast the 5 s wait.
  await expect(
    page.getByRole("navigation", { name: "More" }).getByRole("link", { name: "Progress" }),
  ).toHaveAttribute("href", "/progress");
  await page.goto("/progress");
  await expect(page.getByText("Explained 1 · owned 1 of 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Explained 0 · owned 0 of 1", { exact: true })).toBeVisible();
});

test("/progress shows ownership by project and narrows its numbers to a picked one", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "By project" })).toBeVisible();
  await expect(page.getByText("3 cards · 1 explained · 1 owned")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Projects" })
    .getByRole("link", { name: "rapporteur", exact: true })
    .click();
  await expect(page).toHaveURL(/\/progress\?repo=rapporteur$/);
  await expect(page.getByText("1 cards · 0 explained · 0 owned")).toBeVisible();
  // The review queue isn't split by project, and says so.
  await expect(page.getByText("From all your projects.")).toBeVisible();
  const bySession = page
    .getByRole("heading", { name: "By session" })
    .locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(bySession.getByText("Stream the report export")).toBeVisible();
  await expect(bySession.getByText("Add rate limiting")).toHaveCount(0);

  // A repo the learner has no session in goes back to every project.
  await page.goto("/progress?repo=nope");
  await expect(page).toHaveURL(/\/progress$/);
});
