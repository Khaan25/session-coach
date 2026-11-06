// Answer first on /s/[id]: an unanswered card shows only its decision, question and answer box, and its why is not in
// the page at all, nor readable through Supabase's REST API with the learner's own session. "I don't know yet" reveals
// the why, scores 0 and keeps the card's step. The day stops at 5 answers, on the server too.
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
const modelAnswer = "A shared IP would block every learner behind it; the token names one learner.";
const quote = `key it on the token ${randomUUID().slice(0, 8)}`;
let userId = "";
let sessionId = "";
let cardId = "";
/** A card already on step 2 and due today, to skip. */
let dueCardId = "";
/** A card never answered, for the daily cap. */
let spareCardId = "";

const today = () => new Date().toISOString().slice(0, 10);

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
  const cards = await admin
    .from("decision_cards")
    .insert(
      [0, 1, 2].map((position) => ({
        session_id: sessionId,
        user_id: userId,
        position,
        decision: ["Rate limit uploads per token, not per IP", "Second card", "Third card"][
          position
        ],
        why: position === 0 ? why : `why ${position}`,
        source: "stated",
        evidence: [
          { event_index: 1, quote: position === 0 ? quote : `quote ${position}`, verified: true },
        ],
        question: position === 0 ? question : `Question ${position}?`,
        model_answer: modelAnswer,
      })),
    )
    .select("id, position");
  if (cards.error) throw cards.error;
  const byPosition = new Map(cards.data.map(({ id, position }) => [position, id]));
  cardId = byPosition.get(0)!;
  dueCardId = byPosition.get(1)!;
  spareCardId = byPosition.get(2)!;
  // Profiles default to UTC, so the learner's today is the UTC date.
  const review = await admin
    .from("reviews")
    .insert({ card_id: dueCardId, user_id: userId, step: 2, due_on: today(), last_score: 2 });
  if (review.error) throw review.error;
});

test.afterAll(async () => {
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) throw deleted.error;
  }
});

test("the why and the evidence aren't readable through the REST API with the learner's session", async () => {
  const learner = createClient(stack.url, stack.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await learner.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  for (const column of ["why", "evidence", "model_answer"]) {
    const read = await learner.from("decision_cards").select(`id, ${column}`).eq("id", cardId);
    expect(read.error?.code, `${column} readable`).toBe("42501");
    expect(read.data).toBeNull();
  }
  // The columns a learner may read still work.
  const head = await learner.from("decision_cards").select("id, question").eq("id", cardId);
  expect(head.error).toBeNull();
  expect(head.data).toEqual([{ id: cardId, question }]);
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
  const html = await response!.text();
  const content = await page.content();
  for (const secret of [why, modelAnswer, quote]) {
    expect(html).not.toContain(secret);
    expect(content).not.toContain(secret);
  }

  await page
    .getByRole("region", { name: "Rate limit uploads per token, not per IP" })
    .getByRole("button", { name: /I don.t know yet/ })
    .click();
  await expect(page.getByRole("heading", { name: "Here's the why" })).toBeVisible();
  await expect(page.getByText(why).first()).toBeVisible();

  const answer = await admin
    .from("answers")
    .select("answer, score, skipped")
    .eq("card_id", cardId)
    .single();
  expect(answer.data).toEqual({ answer: "I don't know yet", score: 0, skipped: true });
  const review = await admin
    .from("reviews")
    .select("step, mastered")
    .eq("card_id", cardId)
    .single();
  expect(review.data).toEqual({ step: 1, mastered: false });

  // Answered now, so the session page shows the whole card.
  await page.reload();
  await expect(page.getByText(why).first()).toBeVisible();
});

test("a skip keeps the card's step, and the day stops at 5 answers", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // A miss would drop a step-2 card to step 1; a skip leaves it on step 2, due tomorrow.
  const skip = await page.request.post("/api/review/answer", {
    data: { cardId: dueCardId, dontKnow: true },
  });
  expect(skip.status()).toBe(200);
  expect(await skip.json()).toMatchObject({ score: 0, step: 2, level: 2, dropped: false });
  const review = await admin.from("reviews").select("step").eq("card_id", dueCardId).single();
  expect(review.data).toEqual({ step: 2 });

  // Top today's answers up to five, whatever ran before.
  const soFar = await admin
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const filler = await admin.from("answers").insert(
    Array.from({ length: 5 - (soFar.count ?? 0) }, () => ({
      card_id: dueCardId,
      user_id: userId,
      review_step: 2,
      answer: "filler",
      score: 2,
    })),
  );
  if (filler.error) throw filler.error;

  const capped = await page.request.post("/api/review/answer", {
    data: { cardId: spareCardId, answer: "A shared IP would block learners." },
  });
  expect(capped.status()).toBe(409);
  expect((await capped.json()).error).toBe(
    "You've done 5 cards today. This one comes back tomorrow.",
  );
  const written = await admin.from("answers").select("id").eq("card_id", spareCardId);
  expect(written.data).toEqual([]);
  const scheduled = await admin.from("reviews").select("card_id").eq("card_id", spareCardId);
  expect(scheduled.data).toEqual([]);

  await page.goto("/review");
  await expect(page.getByRole("main").getByText("Done for today")).toBeVisible();
  // Today says so too, instead of a card.
  await page.goto("/dashboard");
  const done = page.getByRole("region", { name: "You're done for today" });
  await expect(done.getByText("You did 5 cards today. The rest come back tomorrow.")).toBeVisible();
});
