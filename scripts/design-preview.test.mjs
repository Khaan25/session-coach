import { test } from "node:test";
import http from "node:http";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createFixtureServer,
  makeFixtures,
  mutateFixtures,
  previewDestination,
  previewSocketReply,
  PREVIEW_SERVICE_KEY,
  selectRows,
  shareOriginOf,
  USER_ID,
} from "./design-preview.mjs";

const sample = JSON.parse(
  readFileSync(new URL("../packages/shared/fixtures/session.sample.json", import.meta.url), "utf8"),
);
const now = new Date("2026-11-04T06:00:00Z");
const query = (values = {}) => new URLSearchParams(values);

test("preview destinations stay on the local app and use the screen allowlist", () => {
  for (const value of [
    "https://example.com",
    "//example.com",
    "/api/account",
    "/dashboard?next=https://example.com",
    "javascript:alert(1)",
  ])
    assert.equal(previewDestination(value, 3100), "http://localhost:3100/dashboard");
  for (const value of [
    "/login",
    "/canvas",
    "/progress?project=repo%3Arapporteur",
    "/setup?preview=empty-devices",
    "/cli/approve?code=WDJB-MJHT",
  ])
    assert.equal(previewDestination(value, 3110), `http://localhost:3110${value}`);
});

test("fixtures cover learning, project and device states with room for today's attempts", () => {
  const data = makeFixtures(sample, now);
  assert.equal(data.user.email, "alex@example.test");
  assert.deepEqual(
    new Set(data.sessions.map((row) => row.status)),
    new Set(["ready", "processing", "failed", "pending"]),
  );
  assert(data.reviews.some((row) => row.mastered));
  assert(
    data.sessions.some(
      (session) =>
        session.status === "ready" &&
        !data.decision_cards.some((card) => card.session_id === session.id),
    ),
  );
  assert(data.decision_cards.every((card) => !card.hidden));
  assert.equal(data.cli_tokens.length, 2);
  assert.equal(data.projects.length, 2);
  assert(data.answers.every((answer) => answer.created_at < "2026-11-04"));
  assert(data.cli_device_codes.some((row) => row.expires_at > now.toISOString()));
  assert(data.cli_device_codes.some((row) => row.expires_at < now.toISOString()));
});

test("head-only projection excludes why, evidence and answer keys even for the server role", () => {
  const data = makeFixtures(sample, now);
  const params = query({ id: `eq.${data.decision_cards[0].id}`, select: "id,decision,question" });
  for (const role of ["learner", "admin"]) {
    const rows = selectRows(data, "decision_cards", params, "default", role);
    assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]), ["id", "decision", "question"]);
  }
  assert(data.decision_cards[0].model_answer);
});

test("answer-key fields require the server role and are never added by wildcard projection", () => {
  const data = makeFixtures(sample, now);
  const params = query({ select: "id,why,evidence,model_answer" });
  const learner = selectRows(data, "decision_cards", params);
  assert(learner.every((card) => Object.keys(card).join(",") === "id"));
  const admin = selectRows(data, "decision_cards", params, "default", "admin");
  assert(admin[0].why && admin[0].evidence && admin[0].model_answer);
  for (const row of selectRows(
    data,
    "decision_cards",
    query({ select: "*" }),
    "default",
    "admin",
  )) {
    assert.equal(row.model_answer, undefined);
    assert.equal(row.why, undefined);
    assert.equal(row.evidence, undefined);
  }
});

test("review joins distinguish answered and locked cards, and inner joins exclude unanswered cards", () => {
  const data = makeFixtures(sample, now);
  const heads = selectRows(data, "decision_cards", query({ select: "id,reviews(card_id)" }));
  assert.equal(heads.filter((card) => card.reviews === null).length, 2);
  const revealed = selectRows(
    data,
    "decision_cards",
    query({ select: "id,why,reviews!inner(user_id)" }),
    "default",
    "admin",
  );
  assert.equal(revealed.length, 4);
  assert(revealed.every((card) => card.reviews.user_id === USER_ID && card.why));
  assert(!revealed.some((card) => card.id === heads.find((card) => !card.reviews).id));
});

test("nested review-to-card-to-session projection preserves the queue's contract without leaking answers", () => {
  const data = makeFixtures(sample, now);
  const rows = selectRows(
    data,
    "reviews",
    query({
      select:
        "step,due_on,card:decision_cards(id,decision,session_id,session:sessions(title,repo,branch))",
      mastered: "eq.false",
      due_on: "lte.2026-11-04",
    }),
  );
  assert.equal(rows.length, 3);
  assert(rows.every((row) => row.card.id && row.card.session.title));
  assert(rows.every((row) => row.card.why === undefined && row.card.model_answer === undefined));
});

test("empty learning and empty devices scenarios keep the synthetic profile", () => {
  const data = makeFixtures(sample, now);
  for (const table of [
    "sessions",
    "decision_cards",
    "reviews",
    "answers",
    "projects",
    "cli_tokens",
  ])
    assert.deepEqual(selectRows(data, table, query(), "empty"), []);
  assert.equal(selectRows(data, "profiles", query(), "empty").length, 1);
  assert.deepEqual(selectRows(data, "cli_tokens", query(), "empty-devices"), []);
  assert(selectRows(data, "sessions", query(), "empty-devices").length > 0);
});

test("query filtering and stable ordering handle comparison-and-set and next-due reads", () => {
  const data = makeFixtures(sample, now);
  const row = data.reviews[0];
  assert.equal(
    selectRows(data, "reviews", query({ card_id: `eq.${row.card_id}`, updated_at: "eq.stale" }))
      .length,
    0,
  );
  assert.equal(selectRows(data, "reviews", query({ due_on: "gt.2026-11-04" })).length, 0);
  const sorted = selectRows(
    data,
    "decision_cards",
    query({ select: "id,position", order: "position.desc,id.asc" }),
  );
  assert.equal(sorted[0].position, 2);
  assert.equal(sorted.at(-1).position, 0);
  const pending = selectRows(
    data,
    "cli_device_codes",
    query({ approved_at: "is.null", denied_at: "is.null", expires_at: `gt.${now.toISOString()}` }),
    "default",
    "admin",
  );
  assert.equal(pending.length, 1);
});

test("a schedule update is atomic against its previous timestamp and returns selected columns", () => {
  const data = makeFixtures(sample, now);
  const old = { ...data.reviews[0] };
  const params = query({
    card_id: `eq.${old.card_id}`,
    updated_at: `eq.${old.updated_at}`,
    select: "card_id",
  });
  const update = { step: 2, due_on: "2026-11-07", updated_at: "2026-11-04T06:01:00Z" };
  const result = mutateFixtures(data, "reviews", "PATCH", params, update, "admin", now);
  assert.deepEqual(result.rows, [{ card_id: old.card_id }]);
  assert.equal(data.reviews[0].step, 2);
  assert.deepEqual(mutateFixtures(data, "reviews", "PATCH", params, update, "admin", now).rows, []);
});

test("an honest skip records its flag and unlocks a fresh card through the real review relationship", () => {
  const data = makeFixtures(sample, now);
  const card = data.decision_cards[1];
  assert.equal(
    selectRows(
      data,
      "decision_cards",
      query({ id: `eq.${card.id}`, select: "reviews(card_id)" }),
    )[0].reviews,
    null,
  );
  const schedule = {
    card_id: card.id,
    user_id: USER_ID,
    step: 1,
    due_on: "2026-11-05",
    mastered: false,
    last_score: 0,
    updated_at: now.toISOString(),
  };
  assert.equal(
    mutateFixtures(data, "reviews", "POST", query({ select: "card_id" }), schedule, "admin", now)
      .status,
    201,
  );
  const answer = {
    card_id: card.id,
    user_id: USER_ID,
    review_step: 0,
    answer: "I don't know yet",
    score: 0,
    missing: null,
    skipped: true,
  };
  assert.equal(mutateFixtures(data, "answers", "POST", query(), answer, "admin", now).status, 201);
  assert.equal(data.answers.at(-1).skipped, true);
  assert.equal(
    selectRows(
      data,
      "decision_cards",
      query({ id: `eq.${card.id}`, select: "reviews(card_id)" }),
    )[0].reviews.card_id,
    card.id,
  );
  const again = mutateFixtures(data, "reviews", "POST", query(), schedule, "admin", now);
  assert.equal(again.error.code, "23505");
});

test("project level changes update the synthetic row and preserve its identity", () => {
  const data = makeFixtures(sample, now);
  const project = data.projects[0];
  const id = project.id;
  const changed = mutateFixtures(
    data,
    "projects",
    "PATCH",
    query({ user_id: `eq.${USER_ID}`, repo: `eq.${project.repo}`, select: "id" }),
    { question_level: "complex", onboarded_at: now.toISOString() },
  );
  assert.deepEqual(changed.rows, [{ id }]);
  assert.equal(project.question_level, "complex");
  assert.equal(
    mutateFixtures(data, "projects", "POST", query(), {
      user_id: USER_ID,
      repo: "unknown/project",
      question_level: "simple",
    }).status,
    403,
  );
});

test("device decisions can win only once against an unexpired pending request", () => {
  const data = makeFixtures(sample, now);
  const device = data.cli_device_codes[0];
  const params = query({
    user_code: `eq.${device.user_code}`,
    expires_at: `gt.${now.toISOString()}`,
    approved_at: "is.null",
    denied_at: "is.null",
    select: "id",
  });
  const result = mutateFixtures(
    data,
    "cli_device_codes",
    "PATCH",
    params,
    { approved_by: USER_ID, approved_at: now.toISOString() },
    "admin",
    now,
  );
  assert.deepEqual(result.rows, [{ id: device.id }]);
  assert.deepEqual(
    mutateFixtures(
      data,
      "cli_device_codes",
      "PATCH",
      params,
      { denied_at: now.toISOString() },
      "admin",
      now,
    ).rows,
    [],
  );
});

test("unsupported writes and learner-authored grades are refused without changing fixtures", () => {
  const data = makeFixtures(sample, now);
  const before = JSON.stringify(data);
  for (const [table, method] of [
    ["cli_tokens", "POST"],
    ["cli_tokens", "DELETE"],
    ["sessions", "PATCH"],
    ["profiles", "DELETE"],
    ["reviews", "DELETE"],
  ])
    assert.equal(mutateFixtures(data, table, method, query(), {}, "admin").status, 405);
  assert.equal(
    mutateFixtures(data, "answers", "POST", query(), { user_id: USER_ID, score: 2 }, "learner")
      .status,
    403,
  );
  assert.equal(mutateFixtures(data, "profiles", "PATCH", query(), { id: "changed" }).status, 400);
  assert.equal(JSON.stringify(data), before);
});

test("HTTP adapter issues local-only preview redirects, exposes project RPC, and refuses remote origins", async () => {
  const fixtures = makeFixtures(sample, now);
  const server = createFixtureServer({
    fixtures,
    appPort: 3100,
    fixturePort: 54329,
    resetFixtures: () => makeFixtures(sample, now),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const preview = await fetch(
      `${base}/preview?screen=${encodeURIComponent("/cli/approve?code=WDJB-MJHT")}`,
      { redirect: "manual" },
    );
    assert.equal(preview.status, 302);
    assert.equal(
      preview.headers.get("location"),
      "http://localhost:3100/cli/approve?code=WDJB-MJHT",
    );
    assert.match(preview.headers.get("set-cookie"), /HttpOnly/);
    const cookie = preview.headers.get("set-cookie").split(";")[0].split("=")[1];
    const session = JSON.parse(Buffer.from(cookie.slice(7), "base64url").toString());
    const headers = { authorization: `Bearer ${session.access_token}` };
    const repos = await fetch(`${base}/rest/v1/rpc/learner_repos`, { method: "POST", headers });
    assert.deepEqual(await repos.json(), [{ repo: "rapporteur" }, { repo: "session-coach" }]);
    assert.equal((await fetch(`${base}/rest/v1/projects`)).status, 401);
    assert.equal(
      (
        await fetch(`${base}/rest/v1/projects`, {
          headers: { ...headers, origin: "https://example.com" },
        })
      ).status,
      403,
    );
    const rejectedHost = await new Promise((resolve, reject) => {
      const request = http.get(
        `${base}/rest/v1/projects`,
        { headers: { ...headers, host: "attacker.example" } },
        (response) => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        },
      );
      request.on("error", reject);
    });
    assert.equal(rejectedHost, 403);
    const rows = await fetch(`${base}/rest/v1/decision_cards?select=id,question,why,model_answer`, {
      headers,
    });
    assert(
      (await rows.json()).every((row) => row.why === undefined && row.model_answer === undefined),
    );
    const admin = await fetch(`${base}/rest/v1/decision_cards?select=model_answer&limit=1`, {
      headers: { authorization: `Bearer ${PREVIEW_SERVICE_KEY}` },
    });
    assert((await admin.json())[0].model_answer);
    fixtures.projects[0].question_level = "complex";
    await fetch(`${base}/preview?reset=1`, { redirect: "manual" });
    assert.equal(fixtures.projects[0].question_level, "simple");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("realtime acknowledgements preserve the current client's tuple protocol and filters", () => {
  const filter = {
    event: "UPDATE",
    schema: "public",
    table: "sessions",
    filter: "user_id=eq." + USER_ID,
  };
  const reply = JSON.parse(
    previewSocketReply(
      JSON.stringify([
        "1",
        "2",
        "realtime:sessions",
        "phx_join",
        { config: { postgres_changes: [filter] } },
      ]),
    ),
  );
  assert.deepEqual(reply, [
    "1",
    "2",
    "realtime:sessions",
    "phx_reply",
    { status: "ok", response: { postgres_changes: [{ ...filter, id: 1 }] } },
  ]);
});
test("realtime heartbeats keep the object protocol and malformed frames are ignored", () => {
  assert.deepEqual(
    JSON.parse(
      previewSocketReply(JSON.stringify({ topic: "phoenix", event: "heartbeat", ref: "3" })),
    ),
    { topic: "phoenix", event: "phx_reply", ref: "3", payload: { status: "ok", response: {} } },
  );
  assert.equal(previewSocketReply("not json"), null);
  assert.equal(previewSocketReply(JSON.stringify(["1", "2", "topic", "broadcast", {}])), null);
});

test("unassigned project queries include null and empty repositories without crossing projects", () => {
  const fixtures = makeFixtures(sample, now);
  fixtures.sessions[0].repo = null;
  fixtures.sessions[1].repo = "";
  const selected = selectRows(
    fixtures,
    "sessions",
    query({ select: "id,repo", or: "(repo.is.null,repo.eq.)" }),
  );
  assert.equal(selected.length, 2);
  assert(selected.every((session) => session.repo === null || session.repo === ""));
});

test("shared preview origins require explicit HTTPS and keep destinations on the allowlist", () => {
  assert.equal(shareOriginOf("https://preview.example.test/"), "https://preview.example.test");
  for (const value of [
    "http://preview.example.test",
    "https://user:password@preview.example.test",
    "https://preview.example.test/path",
    "https://preview.example.test/?next=elsewhere",
    "https://localhost",
    "https://127.0.0.1",
  ])
    assert.throws(() => shareOriginOf(value));
  assert.equal(
    previewDestination("/progress", 3100, "https://preview.example.test"),
    "https://preview.example.test/progress",
  );
  assert.equal(
    previewDestination("https://elsewhere.test", 3100, "https://preview.example.test"),
    "https://preview.example.test/dashboard",
  );
});

test("shared entry redirects to its exact public host and keeps server-only fixture access private", async () => {
  const server = createFixtureServer({
    fixtures: makeFixtures(sample, now),
    appPort: 3100,
    fixturePort: 54329,
    shareOrigin: "https://preview.example.test",
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const headers = {
      "x-forwarded-host": "preview.example.test",
      origin: "https://preview.example.test",
    };
    const entry = await fetch(base + "/preview?screen=%2Fprogress", {
      headers,
      redirect: "manual",
    });
    assert.equal(entry.status, 302);
    assert.equal(entry.headers.get("location"), "https://preview.example.test/progress");
    assert.match(entry.headers.get("set-cookie"), /Secure/);
    assert.doesNotMatch(entry.headers.get("set-cookie"), /HttpOnly/);
    const blocked = await fetch(base + "/rest/v1/decision_cards?select=model_answer", {
      headers: { ...headers, authorization: `Bearer ${PREVIEW_SERVICE_KEY}` },
    });
    assert.equal(blocked.status, 403);
    const local = await fetch(base + "/rest/v1/decision_cards?select=model_answer", {
      headers: { authorization: `Bearer ${PREVIEW_SERVICE_KEY}` },
    });
    assert.equal(local.status, 200);
    const forged = await fetch(base + "/preview", {
      headers: { "x-forwarded-host": "elsewhere.test" },
      redirect: "manual",
    });
    assert.equal(forged.headers.get("location"), "http://localhost:3100/dashboard");
    const crossOrigin = await fetch(base + "/preview", {
      headers: { origin: "https://elsewhere.test" },
      redirect: "manual",
    });
    assert.equal(crossOrigin.status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("synthetic Defend it enforces server writes and preserves the review schedule", () => {
  const fixtures = makeFixtures(sample, now);
  const card = fixtures.reviews.find((row) => row.mastered).card_id;
  const input = { user_id: USER_ID, card_id: card, started_at: now.toISOString() };
  assert.equal(mutateFixtures(fixtures, "defenses", "POST", query(), input).status, 403);
  const before = structuredClone({ reviews: fixtures.reviews, answers: fixtures.answers });
  const made = mutateFixtures(fixtures, "defenses", "POST", query(), input, "admin", now);
  assert.equal(made.status, 201);
  assert.equal(made.rows[0].status, "answering");
  assert.equal(
    mutateFixtures(fixtures, "defenses", "POST", query(), input, "admin", now).status,
    409,
  );
  const id = made.rows[0].id;
  const changed = mutateFixtures(
    fixtures,
    "defenses",
    "PATCH",
    query({ id: "eq." + id, status: "eq.answering" }),
    { status: "finished", score: 2 },
    "admin",
    now,
  );
  assert.equal(changed.rows.length, 1);
  assert.equal(
    mutateFixtures(
      fixtures,
      "defenses",
      "PATCH",
      query({ id: "eq." + id, status: "eq.answering" }),
      { status: "follow_up" },
      "admin",
      now,
    ).rows.length,
    0,
  );
  assert.deepEqual({ reviews: fixtures.reviews, answers: fixtures.answers }, before);
});

test("defense eligibility only joins a learner's visible decisions", () => {
  const fixtures = makeFixtures(sample, now);
  const selected = selectRows(
    fixtures,
    "answers",
    query({ select: "card_id,card:decision_cards!inner(id)", score: "eq.2" }),
  );
  assert(selected.length > 0);
  const hidden = selected[0].card_id;
  fixtures.decision_cards.find((card) => card.id === hidden).hidden = true;
  const after = selectRows(
    fixtures,
    "answers",
    query({ select: "card_id,card:decision_cards!inner(id)", score: "eq.2" }),
  );
  assert(after.every((row) => row.card_id !== hidden));
});

test("public reports start private and nested project filters only return selected owned decisions", () => {
  const data = makeFixtures(sample, now);
  assert.equal(data.profiles[0].report_on, false);
  assert(data.projects.every((project) => project.report_shown === false));
  const ownedId = data.reviews.find((review) => review.mastered).card_id;
  const ownedCard = data.decision_cards.find((card) => card.id === ownedId);
  // The default owned card has flagged evidence and must not appear on a report.
  assert.equal(ownedCard.flagged, true);
  ownedCard.flagged = false;
  const select =
    "card_id,updated_at,card:decision_cards!inner(decision,evidence,hidden,flagged,session:sessions!inner(repo))";
  const params = query({
    select,
    mastered: "eq.true",
    "card.hidden": "eq.false",
    "card.flagged": "eq.false",
    "card.session.repo": "in.(rapporteur)",
  });
  const rows = selectRows(data, "reviews", params, "default", "admin");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].card.session.repo, "rapporteur");
  assert(rows[0].card.evidence.length > 0);
  params.set("card.session.repo", "in.(session-coach)");
  assert.equal(selectRows(data, "reviews", params, "default", "admin").length, 0);
  assert(data.answers.every((answer) => Number.isInteger(answer.review_step)));
});

test("report opt-in and repo selection are learner choices, while replacing the link requires the server", () => {
  const data = makeFixtures(sample, now);
  assert.equal(mutateFixtures(data, "profiles", "PATCH", query(), { report_on: true }).status, 200);
  const project = data.projects[0];
  assert.equal(
    mutateFixtures(data, "projects", "PATCH", query({ repo: "eq." + project.repo }), {
      report_shown: true,
    }).status,
    200,
  );
  assert.equal(project.report_shown, true);
  const old = data.profiles[0].report_slug;
  const slug = "22222222222242228222222222222222";
  assert.equal(
    mutateFixtures(data, "profiles", "PATCH", query(), { report_slug: slug }).status,
    403,
  );
  assert.equal(data.profiles[0].report_slug, old);
  assert.equal(
    mutateFixtures(data, "profiles", "PATCH", query(), { report_slug: slug }, "admin").status,
    200,
  );
  assert.equal(data.profiles[0].report_slug, slug);
});
