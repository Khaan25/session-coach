import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { saveProjectLevel } from "./save.ts";

type Call = {
  op: "update" | "insert";
  values: Record<string, unknown>;
  filters: [string, unknown][];
};
type Answer = { data?: unknown[]; error?: { code: string } | null };

/** A fake Supabase client that records each write and answers from a list, in order. */
function fakeClient(...answers: Answer[]) {
  const calls: Call[] = [];
  const next = () => {
    const answer = answers[calls.length - 1] ?? {};
    return Promise.resolve({ data: answer.data ?? [], error: answer.error ?? null });
  };
  const client = {
    from(table: string) {
      assert.equal(table, "projects");
      return {
        update(values: Record<string, unknown>) {
          const call: Call = { op: "update", values, filters: [] };
          calls.push(call);
          const chain = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return chain;
            },
            select: next,
          };
          return chain;
        },
        insert(values: Record<string, unknown>) {
          calls.push({ op: "insert", values, filters: [] });
          return next();
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const now = new Date("2026-11-04T09:00:00Z");
const input = { repo: "acme/web", question_level: "hard" };

test("invalid input is refused before any query", async () => {
  for (const bad of [
    null,
    {},
    { repo: "acme/web", question_level: "medium" },
    { repo: "", question_level: "hard" },
    { repo: "x".repeat(201), question_level: "hard" },
  ]) {
    const { client, calls } = fakeClient();
    const { error } = await saveProjectLevel(client, "u1", bad, now);
    assert.match(error ?? "", /simple, hard or complex/);
    assert.equal(calls.length, 0);
  }
});

test("an existing row is updated, scoped to the caller's user id and the repo", async () => {
  const { client, calls } = fakeClient({ data: [{ id: "p1" }] });
  assert.deepEqual(await saveProjectLevel(client, "u1", input, now), { error: null });
  assert.deepEqual(calls, [
    {
      op: "update",
      values: { question_level: "hard", onboarded_at: now.toISOString() },
      filters: [
        ["user_id", "u1"],
        ["repo", "acme/web"],
      ],
    },
  ]);
});

test("no row yet: inserts one owned by the caller, ignoring any user_id in the input", async () => {
  const { client, calls } = fakeClient({ data: [] }, {});
  const result = await saveProjectLevel(client, "u1", { ...input, user_id: "someone-else" }, now);
  assert.deepEqual(result, { error: null });
  assert.deepEqual(calls[1], {
    op: "insert",
    values: {
      user_id: "u1",
      repo: "acme/web",
      question_level: "hard",
      onboarded_at: now.toISOString(),
    },
    filters: [],
  });
});

test("a row another tab inserted first is updated instead", async () => {
  const { client, calls } = fakeClient(
    { data: [] },
    { error: { code: "23505" } },
    { data: [{ id: "p1" }] },
  );
  assert.deepEqual(await saveProjectLevel(client, "u1", input, now), { error: null });
  assert.deepEqual(
    calls.map((call) => call.op),
    ["update", "insert", "update"],
  );
});

test("a repo the learner has no session in is refused by RLS and says so", async () => {
  const { client } = fakeClient({ data: [] }, { error: { code: "42501" } });
  const { error } = await saveProjectLevel(client, "u1", input, now);
  assert.equal(error, "That project isn't one of yours.");
});

test("a database error gives a generic message, never the database's", async () => {
  const { client } = fakeClient({ error: { code: "XX000" } });
  const { error } = await saveProjectLevel(client, "u1", input, now);
  assert.equal(error, "The question level couldn't be saved. Try again.");
});
