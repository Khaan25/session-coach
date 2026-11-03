// Two-learner RLS check against the LOCAL Supabase stack: `pnpm test:rls` (needs `supabase start`; CI runs it in
// its own job, not in `pnpm test`). Creates two throwaway learners with the admin API, gives each a full set of rows with the
// service role, signs each in with the anon key, and checks they see only their own rows and can't write the
// tables only the server writes. Deletes both learners at the end; their rows cascade.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localStack } from "./local-stack.ts";

const stack = localStack();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(stack.url, stack.serviceKey, options);

// The learner-visible card columns (migration 20261028000000_init.sql); model_answer is not one.
const CARD_COLUMNS = "id, session_id, user_id, question, hidden";

type Learner = {
  id: string;
  client: SupabaseClient;
  sessionId: string;
  cardId: string;
  hiddenCardId: string;
  tokenId: string;
};

const learners: Learner[] = [];

async function makeLearner(tag: string): Promise<Learner> {
  const email = `rls-${tag}-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;

  const sessionId = randomUUID();
  const cardId = randomUUID();
  const hiddenCardId = randomUUID();
  const tokenId = randomUUID();
  const card = (cardIdValue: string, position: number, verified: boolean) => ({
    id: cardIdValue,
    session_id: sessionId,
    user_id: id,
    position,
    decision: `${tag} decision ${position}`,
    why: "why",
    source: "stated",
    evidence: [{ event_index: 1, quote: "q", verified }],
    question: "question?",
    model_answer: `${tag} secret answer key`,
  });
  const writes = [
    () =>
      admin
        .from("sessions")
        .insert({ id: sessionId, user_id: id, external_id: tag, raw_path: `${id}/x` }),
    // hidden is generated: a card with no verified evidence is hidden from its learner.
    () =>
      admin.from("decision_cards").insert([card(cardId, 0, true), card(hiddenCardId, 1, false)]),
    () =>
      admin
        .from("answers")
        .insert({ card_id: cardId, user_id: id, review_step: 0, answer: "a", score: 1 }),
    () =>
      admin.from("reviews").insert({ card_id: cardId, user_id: id, step: 1, due_on: "2026-11-01" }),
    () => admin.from("cli_tokens").insert({ id: tokenId, user_id: id, token_hash: randomUUID() }),
    () =>
      admin.from("email_log").insert({ user_id: id, kind: "daily_review", sent_on: "2026-10-31" }),
  ];
  for (const write of writes) {
    const { error } = await write();
    if (error) throw error;
  }

  const client = createClient(stack.url, stack.anonKey, options);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id, client, sessionId, cardId, hiddenCardId, tokenId };
}

before(async () => {
  learners.push(await makeLearner("a"), await makeLearner("b"));
});

after(async () => {
  for (const learner of learners) await admin.auth.admin.deleteUser(learner.id);
});

/** Every (me, other) pair, so each learner is checked against the other. */
const pairs = () =>
  [
    [learners[0], learners[1]],
    [learners[1], learners[0]],
  ] as const;

test("a learner reads only their own rows in every table", async () => {
  for (const [me, other] of pairs()) {
    for (const [table, columns, owner] of [
      ["sessions", "id, user_id", "user_id"],
      ["answers", "id, user_id", "user_id"],
      ["reviews", "card_id, user_id", "user_id"],
      ["cli_tokens", "id, user_id", "user_id"],
      ["profiles", "id", "id"],
    ] as const) {
      const { data, error } = await me.client.from(table).select(columns);
      assert.ifError(error);
      assert.ok(data.length > 0, `${table}: own rows visible`);
      for (const row of data as unknown as Record<string, string>[])
        assert.equal(row[owner], me.id, `${table}: saw another learner's row`);
      // Asking for the other learner's rows by id returns nothing.
      const theirs = await me.client.from(table).select(columns).eq(owner, other.id);
      assert.ifError(theirs.error);
      assert.equal(theirs.data.length, 0, `${table}: read another learner's rows by id`);
    }
  }
});

test("email_log is server only: a learner reads none, not even their own", async () => {
  for (const [me] of pairs()) {
    const { data, error } = await me.client.from("email_log").select("id, user_id");
    assert.ifError(error);
    assert.equal(data.length, 0);
  }
});

test("decision_cards: own visible cards only, no hidden cards, no other learner's cards", async () => {
  for (const [me, other] of pairs()) {
    const { data, error } = await me.client.from("decision_cards").select(CARD_COLUMNS);
    assert.ifError(error);
    assert.deepEqual(
      data.map((card) => card.id),
      [me.cardId],
    );
    for (const id of [me.hiddenCardId, other.cardId, other.hiddenCardId]) {
      const one = await me.client.from("decision_cards").select(CARD_COLUMNS).eq("id", id);
      assert.ifError(one.error);
      assert.equal(one.data.length, 0, `card ${id} visible`);
    }
  }
});

test("decision_cards: model_answer, why and evidence are not readable, and select * fails", async () => {
  for (const [me] of pairs()) {
    // Answer first: the why and the evidence come only from the server, after an answer (migration 20261104000000).
    for (const column of ["why", "evidence"]) {
      const read = await me.client.from("decision_cards").select(`id, ${column}`);
      assert.ok(read.error, `${column} was readable`);
      assert.equal(read.error.code, "42501");
    }
    const key = await me.client.from("decision_cards").select("id, model_answer");
    assert.ok(key.error, "model_answer was readable");
    assert.equal(key.error.code, "42501"); // insufficient_privilege
    const star = await me.client.from("decision_cards").select("*");
    assert.ok(star.error, "select * succeeded");
  }
});

test("a learner can't write answers or reviews, even for their own card", async () => {
  for (const [me, other] of pairs()) {
    for (const userId of [me.id, other.id]) {
      const answer = await me.client
        .from("answers")
        // Each user_id with that learner's own card, so a refusal comes from RLS and not the (card_id, user_id) key.
        .insert({
          card_id: userId === me.id ? me.cardId : other.cardId,
          user_id: userId,
          review_step: 0,
          answer: "x",
          score: 2,
        });
      assert.ok(answer.error, "answers insert allowed");
    }
    const review = await me.client
      .from("reviews")
      .insert({ card_id: me.hiddenCardId, user_id: me.id, step: 3, due_on: null, mastered: true });
    assert.ok(review.error, "reviews insert allowed");
    // Updates and deletes without a policy match no rows; the admin read below proves nothing moved.
    await me.client
      .from("reviews")
      .update({ mastered: true, due_on: null })
      .eq("card_id", me.cardId);
    await me.client.from("answers").update({ score: 2 }).eq("card_id", me.cardId);
    await me.client.from("answers").delete().eq("card_id", other.cardId);
    const stored = await admin.from("reviews").select("mastered").eq("card_id", me.cardId).single();
    assert.equal(stored.data?.mastered, false, "review moved");
    const scores = await admin
      .from("answers")
      .select("score")
      .in("card_id", [me.cardId, other.cardId]);
    assert.deepEqual(
      scores.data?.map((row) => row.score),
      [1, 1],
      "answers changed",
    );
  }
});

test("a learner can't change another learner's profile or revoke their CLI token", async () => {
  for (const [me, other] of pairs()) {
    await me.client.from("profiles").update({ display_name: "hijacked" }).eq("id", other.id);
    await me.client.from("cli_tokens").delete().eq("id", other.tokenId);
    const profile = await admin.from("profiles").select("display_name").eq("id", other.id).single();
    assert.notEqual(profile.data?.display_name, "hijacked");
    const token = await admin.from("cli_tokens").select("id").eq("id", other.tokenId);
    assert.equal(token.data?.length, 1, "other learner's token deleted");
  }
});

test("tracker_tasks: members read, add and edit only the granted columns; others see and change nothing", async () => {
  const [member, outsider] = learners;
  const anon = createClient(stack.url, stack.anonKey, options);
  // Every row this test writes, so the finally removes them even when setup fails halfway.
  const added: string[] = [];

  try {
    const seeded = await admin
      .from("tracker_tasks")
      .insert({ section: "rls", position: 1, title: `rls task ${randomUUID()}`, details: "d" })
      .select("id")
      .single<{ id: string }>();
    assert.ifError(seeded.error);
    const taskId = seeded.data.id;
    added.push(taskId);
    const joined = await admin.from("tracker_members").insert({ user_id: member.id });
    assert.ifError(joined.error);
    const stored = async () =>
      (
        await admin
          .from("tracker_tasks")
          .select("title, details, owner, section, done_at, done_by")
          .eq("id", taskId)
          .single()
      ).data;

    // Reads: members see the list; a signed-in non-member and anon see no rows.
    const mine = await member.client.from("tracker_tasks").select("id").eq("id", taskId);
    assert.ifError(mine.error);
    assert.equal(mine.data.length, 1, "member can't read the task");
    for (const [who, client] of [
      ["non-member", outsider.client],
      ["anon", anon],
    ] as const) {
      const { data } = await client.from("tracker_tasks").select("id");
      assert.equal(data?.length ?? 0, 0, `${who} read tracker tasks`);
    }

    // Inserts: members only, and only section, position and title.
    const ok = await member.client
      .from("tracker_tasks")
      .insert({ section: "rls", position: 2, title: "added by a member" })
      .select("id, done_by")
      .single<{ id: string; done_by: string | null }>();
    assert.ifError(ok.error);
    added.push(ok.data.id);
    for (const extra of [
      { details: "x" },
      { owner: "zia" },
      { done_at: new Date().toISOString() },
    ]) {
      const bad = await member.client
        .from("tracker_tasks")
        .insert({ section: "rls", position: 3, title: "extra column", ...extra });
      assert.equal(bad.error?.code, "42501", `member inserted ${Object.keys(extra)[0]}`);
    }
    for (const client of [outsider.client, anon]) {
      const bad = await client
        .from("tracker_tasks")
        .insert({ section: "rls", position: 4, title: "x" });
      assert.ok(bad.error, "non-member insert allowed");
    }

    // Updates: done_at, title and details only; the trigger writes done_by from the caller.
    const ticked = await member.client
      .from("tracker_tasks")
      .update({ done_at: new Date().toISOString(), title: "edited", details: "new notes" })
      .eq("id", taskId);
    assert.ifError(ticked.error);
    const afterTick = await stored();
    assert.equal(afterTick?.title, "edited");
    assert.equal(afterTick?.done_by, member.id, "trigger didn't set done_by");
    for (const change of [
      { owner: "kasam" },
      { section: "moved" },
      { position: 99 },
      { done_by: outsider.id },
    ]) {
      const bad = await member.client.from("tracker_tasks").update(change).eq("id", taskId);
      assert.equal(bad.error?.code, "42501", `member updated ${Object.keys(change)[0]}`);
    }
    const unticked = await member.client
      .from("tracker_tasks")
      .update({ done_at: null })
      .eq("id", taskId);
    assert.ifError(unticked.error);
    assert.equal((await stored())?.done_by, null, "unticking kept done_by");

    // Non-members and anon match no rows, so nothing moves.
    for (const client of [outsider.client, anon]) {
      await client.from("tracker_tasks").update({ title: "hijacked" }).eq("id", taskId);
      await client.from("tracker_tasks").delete().eq("id", taskId);
    }
    const last = await stored();
    assert.equal(last?.title, "edited", "non-member changed the task");
  } finally {
    await admin.from("tracker_tasks").delete().in("id", added);
    await admin.from("tracker_members").delete().eq("user_id", member.id);
  }
});
