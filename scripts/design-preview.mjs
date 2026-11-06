// Local visual development only. Never connected to a real Supabase project.
import http from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const SESSION_ID = "22222222-2222-4222-8222-222222222222";
export const DEVICE_USER_CODE = "WDJB-MJHT";
export const PREVIEW_SERVICE_KEY = "local-preview-service-placeholder";
export const PREVIEW_SCREENS = [
  ...["/dashboard", "/review", "/progress", "/sessions"].flatMap((path) =>
    ["rapporteur", "session-coach"].map(
      (repo) => `${path}?project=${encodeURIComponent("repo:" + repo)}`,
    ),
  ),
  "/",
  "/dashboard",
  "/sessions",
  "/review/complete",
  "/defend",
  "/review",
  "/progress",
  "/settings",
  "/setup",
  "/tracker",
  "/canvas",
  "/setup?preview=empty-devices",
  "/dashboard?preview=project-setup",
  "/cli/approve",
  `/cli/approve?code=${DEVICE_USER_CODE}`,
  "/cli/approve?code=BDFG-HJKL",
  "/review?preview=empty",
  "/progress?preview=empty",
  "/login",
  "/sign-up",
  "/forgot-password",
  "/how-it-works",
  "/pricing",
  "/support",
  "/privacy",
  "/terms",
  "/dashboard?preview=empty",
  `/s/${SESSION_ID}`,
  "/s/44444444-4444-4444-8444-444444444444",
  "/s/99999999-9999-4999-8999-999999999991",
  "/s/99999999-9999-4999-8999-999999999992",
  "/s/88888888-8888-4888-8888-888888888888",
  "/review/55555555-5555-4555-8555-000000000001",
  "/review/55555555-5555-4555-8555-000000000002",
  "/s/33333333-3333-4333-8333-333333333333",
];

/** A sharing origin is explicit, HTTPS-only and never accepts a path or credentials. */
export function shareOriginOf(value) {
  if (value === undefined || value === null || value === "") return null;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("Choose a public HTTPS sharing origin without a path or credentials.");
  return url.origin;
}
export function previewDestination(screen, port, shareOrigin = null) {
  const origin = shareOriginOf(shareOrigin) || `http://localhost:${port}`;
  return origin + (PREVIEW_SCREENS.includes(screen) ? screen : "/dashboard");
}

export function makeFixtures(sample, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(now);
  const user = {
    id: USER_ID,
    email: "alex@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: { display_name: "Alex Morgan" },
    created_at: now.toISOString(),
  };
  const first = {
    ...sample.session,
    id: SESSION_ID,
    user_id: USER_ID,
    branch: "main",
    status: "ready",
    created_at: now.toISOString(),
    started_at: new Date(now.getTime() - 42 * 60000).toISOString(),
    error: null,
  };
  const second = {
    ...first,
    id: "33333333-3333-4333-8333-333333333333",
    title: "Rate limiting, without blocking teammates",
    repo: "session-coach",
    duration_min: 28,
    created_at: new Date(now.getTime() - 86400000).toISOString(),
  };
  const sessions = [
    first,
    second,
    {
      ...first,
      id: "44444444-4444-4444-8444-444444444444",
      title: "Streaming the CLI upload",
      status: "processing",
      repo: "session-coach",
    },
    {
      ...first,
      id: "88888888-8888-4888-8888-888888888888",
      title: "Retry the evidence check",
      status: "failed",
      error:
        "The model response could not be verified. Try a session where the reasoning is discussed.",
      repo: "session-coach",
    },
  ];
  sessions.push(
    {
      ...first,
      id: "99999999-9999-4999-8999-999999999991",
      repo: "session-coach",
      title: "Discuss the next refactor",
      status: "pending",
      created_at: new Date(now.getTime() - 60000).toISOString(),
    },
    {
      ...first,
      id: "99999999-9999-4999-8999-999999999992",
      repo: "session-coach",
      title: "A session without supported decisions",
      created_at: new Date(now.getTime() - 120000).toISOString(),
    },
  );
  const visible = sample.cards.filter((card) => !card.hidden);
  const cards = Array.from({ length: 6 }, (_, index) => ({
    ...visible[index % visible.length],
    id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
    session_id: index < 3 ? first.id : second.id,
    user_id: USER_ID,
    position: index % 3,
    decision: visible[index % visible.length].decision.replace(/^SAMPLE: /, ""),
    created_at: now.toISOString(),
  }));
  const reviews = [cards[0], cards[2], cards[3], cards[5]].map((card, index) => ({
    card_id: card.id,
    user_id: USER_ID,
    step: index === 1 ? 3 : index === 2 ? 2 : 1,
    mastered: index === 1,
    due_on: index === 1 ? null : today,
    last_score: 2,
    updated_at: now.toISOString(),
  }));
  const answers = Array.from({ length: 46 }, (_, index) => ({
    id: index,
    user_id: USER_ID,
    card_id: reviews[index % reviews.length].card_id,
    score: index % 7 === 0 ? 0 : index % 4 === 0 ? 1 : 2,
    skipped: false,
    review_step: index % 4,
    created_at: new Date(now.getTime() - (1 + (index % 23)) * 86400000).toISOString(),
  }));
  const profiles = [
    {
      id: USER_ID,
      email: user.email,
      display_name: "Alex Morgan",
      timezone: "Asia/Kathmandu",
      notify_email: true,
      report_on: false,
      report_slug: "11111111111141118111111111111111",
    },
  ];
  return {
    user,
    sessions,
    decision_cards: cards,
    reviews,
    answers,
    defenses: [],
    profiles,
    projects: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        user_id: USER_ID,
        repo: first.repo,
        report_shown: false,
        question_level: "simple",
        onboarded_at: now.toISOString(),
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        user_id: USER_ID,
        repo: second.repo,
        report_shown: false,
        question_level: "hard",
        onboarded_at: now.toISOString(),
      },
    ],
    cli_tokens: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        user_id: USER_ID,
        label: "alex-macbook (macOS)",
        created_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
        last_used_at: new Date(now.getTime() - 3600000).toISOString(),
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        user_id: USER_ID,
        label: "home-workstation (Linux)",
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
        last_used_at: null,
      },
    ],
    cli_device_codes: [DEVICE_USER_CODE.replace("-", ""), "BDFGHJKL"].map((user_code, index) => ({
      id: `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, "0")}`,
      user_code,
      client_name: "alex-macbook (macOS)",
      requested_ip: "127.0.0.1",
      requested_at: now.toISOString(),
      expires_at: new Date(now.getTime() + (index === 0 ? 600000 : -600000)).toISOString(),
      poll_interval: 5,
      approved_by: null,
      approved_at: null,
      denied_at: null,
      token_issued_at: null,
      last_polled_at: null,
    })),
    tracker_tasks: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        section: "Design review",
        position: 0,
        owner: "both",
        title: "Explore the learning experience",
        details: "Synthetic local preview. These are not real project tasks.",
        done_at: null,
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        section: "Design review",
        position: 1,
        owner: "kasam",
        title: "Check the mobile layouts",
        details: null,
        done_at: now.toISOString(),
      },
    ],
  };
}
// Only the subset of PostgREST used by the real application is implemented here.
// Projection matters: a head-only read must never carry the explanation or answer key.
function selectedFields(select) {
  const fields = [];
  let depth = 0,
    start = 0;
  for (let index = 0; index < select.length; index++) {
    if (select[index] === "(") depth++;
    if (select[index] === ")") depth--;
    if (select[index] === "," && depth === 0) {
      fields.push(select.slice(start, index).trim());
      start = index + 1;
    }
  }
  fields.push(select.slice(start).trim());
  return fields.filter(Boolean);
}

function matches(row, params) {
  for (const [key, filter] of params) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
    if (key === "or") {
      const clauses = filter.replace(/^\(|\)$/g, "").split(",");
      if (
        !clauses.some((clause) => {
          const dot = clause.indexOf(".");
          return (
            dot > 0 &&
            matches(row, new URLSearchParams([[clause.slice(0, dot), clause.slice(dot + 1)]]))
          );
        })
      )
        return false;
      continue;
    }
    const value = key.split(".").reduce((node, part) => node?.[part], row);
    if (filter.startsWith("eq.") && String(value) !== filter.slice(3)) return false;
    if (filter.startsWith("neq.") && String(value) === filter.slice(4)) return false;
    if (filter === "is.null" && value !== null) return false;
    if (filter === "not.is.null" && (value === null || value === undefined)) return false;
    if (
      filter.startsWith("lte.") &&
      (value === null || value === undefined || String(value) > filter.slice(4))
    )
      return false;
    if (
      filter.startsWith("gte.") &&
      (value === null || value === undefined || String(value) < filter.slice(4))
    )
      return false;
    if (
      filter.startsWith("lt.") &&
      (value === null || value === undefined || String(value) >= filter.slice(3))
    )
      return false;
    if (
      filter.startsWith("gt.") &&
      (value === null || value === undefined || String(value) <= filter.slice(3))
    )
      return false;
    if (filter.startsWith("in.(")) {
      const values = filter
        .slice(4, -1)
        .split(",")
        .map((value) => value.replaceAll('"', ""));
      if (!values.includes(String(value))) return false;
    }
  }
  return true;
}

function fixtureRows(fixtures, table, scenario) {
  if (
    scenario === "empty" &&
    [
      "sessions",
      "decision_cards",
      "reviews",
      "answers",
      "defenses",
      "projects",
      "cli_tokens",
    ].includes(table)
  )
    return [];
  if (scenario === "empty-devices" && table === "cli_tokens") return [];
  return fixtures[table] ?? [];
}

function projectRow(fixtures, table, row, select, scenario, access) {
  const result = {};
  for (const field of selectedFields(select || "*")) {
    const relation = field.match(/^(?:(\w+):)?(\w+)(!inner)?\((.*)\)$/s);
    if (relation) {
      const [, alias, related, inner, columns] = relation;
      let rows = [];
      let single = false;
      if (table === "decision_cards" && related === "reviews") {
        rows = fixtureRows(fixtures, "reviews", scenario).filter(
          (review) => review.card_id === row.id && review.user_id === row.user_id,
        );
        single = true;
      } else if (table === "decision_cards" && related === "sessions") {
        rows = fixtureRows(fixtures, "sessions", scenario).filter(
          (session) => session.id === row.session_id && session.user_id === row.user_id,
        );
        single = true;
      } else if (
        ["reviews", "answers", "defenses"].includes(table) &&
        related === "decision_cards"
      ) {
        rows = fixtureRows(fixtures, "decision_cards", scenario).filter(
          (card) => card.id === row.card_id && !card.hidden && card.user_id === row.user_id,
        );
        single = true;
      }
      const projected = rows
        .map((value) => projectRow(fixtures, related, value, columns, scenario, access))
        .filter(Boolean);
      if (inner && projected.length === 0) return null;
      result[alias ?? related] = single ? (projected[0] ?? null) : projected;
    } else if (field === "*") {
      for (const [key, value] of Object.entries(row)) {
        if (
          [
            "model_answer",
            "why",
            "evidence",
            "token_hash",
            "device_code_hash",
            "raw_path",
            "session",
            "card",
          ].includes(key)
        )
          continue;
        result[key] = structuredClone(value);
      }
    } else if (Object.hasOwn(row, field)) {
      if (
        access !== "admin" &&
        ["model_answer", "why", "evidence", "token_hash", "device_code_hash", "raw_path"].includes(
          field,
        )
      )
        continue;
      result[field] = structuredClone(row[field]);
    }
  }
  return result;
}

export function selectRows(fixtures, table, params, scenario = "default", access = "learner") {
  const direct = new URLSearchParams([...params].filter(([key]) => !key.includes(".")));
  const related = new URLSearchParams([...params].filter(([key]) => key.includes(".")));
  let rows = fixtureRows(fixtures, table, scenario).filter((row) => matches(row, direct));
  if (access !== "admin" && table === "decision_cards") rows = rows.filter((row) => !row.hidden);
  const order = (params.get("order") ?? "")
    .split(",")
    .filter(Boolean)
    .map((term) => term.split("."));
  if (order.length)
    rows = rows.toSorted((a, b) => {
      for (const [key, direction] of order) {
        const comparison = String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
          numeric: true,
        });
        if (comparison) return direction === "desc" ? -comparison : comparison;
      }
      return 0;
    });
  return rows
    .map((row) => projectRow(fixtures, table, row, params.get("select") ?? "*", scenario, access))
    .filter(Boolean)
    .filter((row) => matches(row, related));
}

const writable = {
  defenses: ["POST", "PATCH"],
  reviews: ["POST", "PATCH"],
  answers: ["POST"],
  profiles: ["PATCH"],
  projects: ["POST", "PATCH"],
  cli_device_codes: ["PATCH"],
};
const mutationError = (status, code, message) => ({ status, error: { code, message } });

/** Writes only synthetic in-memory rows; account deletion, tokens, uploads and unknown tables stay unavailable. */
export function mutateFixtures(
  fixtures,
  table,
  method,
  params,
  body,
  access = "learner",
  now = new Date(),
) {
  if (!writable[table]?.includes(method))
    return mutationError(
      405,
      "PREVIEW_READ_ONLY",
      "This action is unavailable in design preview. No real data is connected.",
    );
  if (["reviews", "answers", "defenses", "cli_device_codes"].includes(table) && access !== "admin")
    return mutationError(403, "42501", "This fixture write requires the local server role.");
  const input = Array.isArray(body) ? body : [body];
  if (input.some((row) => !row || typeof row !== "object" || Array.isArray(row)))
    return mutationError(400, "22023", "Expected a row object.");
  if (input.some((row) => Object.hasOwn(row, "user_id") && row.user_id !== USER_ID))
    return mutationError(403, "42501", "Only the synthetic learner can be changed.");
  if (
    table === "profiles" &&
    access !== "admin" &&
    input.some((row) => Object.hasOwn(row, "report_slug"))
  )
    return mutationError(403, "42501", "Only the local server role can replace a report link.");
  const fields = {
    defenses: [
      "user_id",
      "card_id",
      "status",
      "started_at",
      "answer",
      "answered_at",
      "follow_up_question",
      "follow_up_started_at",
      "follow_up_answer",
      "score",
      "finished_at",
    ],
    profiles: ["display_name", "timezone", "notify_email", "report_on", "report_slug"],
    projects: ["user_id", "repo", "question_level", "onboarded_at", "report_shown"],
    reviews: ["card_id", "user_id", "step", "due_on", "mastered", "last_score", "updated_at"],
    answers: ["card_id", "user_id", "review_step", "answer", "score", "missing", "skipped"],
    cli_device_codes: ["approved_by", "approved_at", "denied_at"],
  };
  if (input.some((row) => Object.keys(row).some((key) => !fields[table].includes(key))))
    return mutationError(400, "22023", "Unsupported fixture columns.");
  if (
    table === "projects" &&
    input.some(
      (row) => row.question_level && !["simple", "hard", "complex"].includes(row.question_level),
    )
  )
    return mutationError(400, "22023", "Unknown question level.");
  if (
    table === "projects" &&
    method === "POST" &&
    input.some((row) => !fixtures.sessions.some((session) => session.repo === row.repo))
  )
    return mutationError(403, "42501", "That project is not one of the synthetic learner's repos.");
  if (
    table === "reviews" &&
    method === "POST" &&
    input.some((row) => fixtures.reviews.some((review) => review.card_id === row.card_id))
  )
    return mutationError(409, "23505", "A review already exists for this card.");
  if (
    table === "projects" &&
    method === "POST" &&
    input.some((row) =>
      fixtures.projects.some(
        (project) => project.repo === row.repo && project.user_id === row.user_id,
      ),
    )
  )
    return mutationError(409, "23505", "This project already exists.");
  if (
    table === "defenses" &&
    method === "POST" &&
    fixtures.defenses.some((row) => ["answering", "follow_up"].includes(row.status))
  )
    return mutationError(409, "23505", "A synthetic defense is already running.");
  let rows;
  if (method === "PATCH") {
    if (input.length !== 1) return mutationError(400, "22023", "Expected one update object.");
    rows = fixtures[table].filter((row) => matches(row, params));
    for (const row of rows) Object.assign(row, input[0]);
  } else {
    rows = input.map((row, index) => ({
      ...(table === "defenses"
        ? {
            status: "answering",
            answer: null,
            follow_up_question: null,
            follow_up_started_at: null,
            follow_up_answer: null,
            score: null,
          }
        : {}),
      ...row,
      ...(table === "reviews"
        ? {}
        : {
            id: `99999999-9999-4999-8999-${String(fixtures[table].length + index + 1).padStart(12, "0")}`,
          }),
      created_at: now.toISOString(),
    }));
    fixtures[table].push(...rows);
  }
  return {
    status: method === "POST" ? 201 : 200,
    rows: rows.map((row) =>
      projectRow(fixtures, table, row, params.get("select") ?? "*", "default", access),
    ),
  };
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Reply in the installed client's Phoenix wire format, including its requested Postgres bindings. */
export function previewSocketReply(raw) {
  try {
    const decoded = JSON.parse(raw.toString());
    const message = Array.isArray(decoded)
      ? {
          join_ref: decoded[0],
          ref: decoded[1],
          topic: decoded[2],
          event: decoded[3],
          payload: decoded[4],
        }
      : decoded;
    if (!["phx_join", "heartbeat", "phx_leave"].includes(message?.event)) return null;
    const payload = {
      status: "ok",
      response:
        message.event === "phx_join"
          ? {
              postgres_changes: (message.payload?.config?.postgres_changes ?? []).map(
                (binding, index) => ({ ...binding, id: index + 1 }),
              ),
            }
          : {},
    };
    return JSON.stringify(
      Array.isArray(decoded)
        ? [message.join_ref, message.ref, message.topic, "phx_reply", payload]
        : {
            join_ref: message.join_ref,
            ref: message.ref,
            topic: message.topic,
            event: "phx_reply",
            payload,
          },
    );
  } catch {
    return null;
  }
}

/** Creates only the loopback fixture adapter; the development app is started separately by startDesignPreview. */
export function createFixtureServer({
  fixtures,
  appPort,
  fixturePort,
  resetFixtures,
  shareOrigin = null,
}) {
  const publicOrigin = shareOriginOf(shareOrigin);
  const publicHost = publicOrigin ? new URL(publicOrigin).host : null;
  const issuer = `http://127.0.0.1:${fixturePort}/auth/v1`;
  return http.createServer(async (request, response) => {
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json");
    const send = (status, value) => {
      response.writeHead(status);
      response.end(JSON.stringify(value));
    };
    let hostname;
    try {
      hostname = new URL(`http://${request.headers.host}`).hostname;
    } catch {
      return send(400, { error: "Invalid local host" });
    }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname))
      return send(403, { error: "This preview is available only on loopback hosts." });
    const origin = request.headers.origin;
    const origins = [`http://localhost:${appPort}`, `http://127.0.0.1:${appPort}`];
    if (publicOrigin) origins.push(publicOrigin);
    const sharedRequest = publicHost !== null && request.headers["x-forwarded-host"] === publicHost;
    if (origin && !origins.includes(origin))
      return send(403, { error: "Cross-origin fixture request refused." });
    if (origin) response.setHeader("access-control-allow-origin", origin);
    response.setHeader(
      "access-control-allow-headers",
      "authorization, apikey, content-type, x-client-info, prefer",
    );
    response.setHeader("access-control-allow-methods", "GET, HEAD, OPTIONS, POST, PATCH");
    response.setHeader("access-control-expose-headers", "content-range");
    if (request.method === "OPTIONS") return response.end();
    const url = new URL(request.url, `http://localhost:${fixturePort}`);
    if (url.pathname === "/preview") {
      const requested = url.searchParams.get("screen") ?? "/dashboard";
      const screen = PREVIEW_SCREENS.includes(requested) ? requested : "/dashboard";
      if (url.searchParams.get("reset") === "1" && resetFixtures)
        Object.assign(fixtures, resetFixtures());
      if (screen.includes("preview=project-setup"))
        fixtures.projects.forEach((project) => {
          project.onboarded_at = null;
        });
      if (screen === `/cli/approve?code=${DEVICE_USER_CODE}`) {
        const device = fixtures.cli_device_codes.find(
          (row) => row.user_code === DEVICE_USER_CODE.replace("-", ""),
        );
        Object.assign(device, {
          approved_by: null,
          approved_at: null,
          denied_at: null,
          token_issued_at: null,
          requested_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 600000).toISOString(),
        });
      }
      const signedOut = ["/login", "/sign-up", "/forgot-password"].includes(screen);
      const scenario = screen.includes("preview=empty-devices")
        ? "empty-devices"
        : screen.includes("preview=empty")
          ? "empty"
          : "default";
      const now = Math.floor(Date.now() / 1000);
      const token = [
        b64({ alg: "HS256", typ: "JWT" }),
        b64({
          sub: USER_ID,
          email: fixtures.user.email,
          aud: "authenticated",
          role: "authenticated",
          iss: issuer,
          exp: now + 86400,
          iat: now,
          preview_scenario: scenario,
        }),
        Buffer.from("synthetic-local-fixture").toString("base64url"),
      ].join(".");
      const cookie =
        "base64-" +
        b64({
          access_token: token,
          refresh_token: "synthetic-preview",
          expires_at: now + 86400,
          expires_in: 86400,
          token_type: "bearer",
          user: fixtures.user,
        });
      response.setHeader(
        "set-cookie",
        `sb-127-auth-token=${signedOut ? "" : cookie}; Path=/; Max-Age=${signedOut ? 0 : 86400}; SameSite=Lax${publicOrigin ? "" : "; HttpOnly"}${sharedRequest ? "; Secure" : ""}`,
      );
      response.writeHead(302, {
        location: previewDestination(screen, appPort, sharedRequest ? publicOrigin : null),
      });
      return response.end();
    }
    const bearer = (request.headers.authorization ?? "").replace(/^Bearer /i, "");
    if (sharedRequest && bearer === PREVIEW_SERVICE_KEY)
      return send(403, {
        error: "Server-only fixture access is unavailable through the sharing origin.",
      });
    const access = bearer === PREVIEW_SERVICE_KEY ? "admin" : "learner";
    let claims = null;
    try {
      claims = JSON.parse(Buffer.from(bearer.split(".")[1], "base64url").toString());
    } catch {
      /* Only locally issued preview tokens are accepted below. */
    }
    const authenticated =
      access === "admin" ||
      (claims?.sub === USER_ID &&
        claims.exp > Date.now() / 1000 &&
        bearer.endsWith("." + Buffer.from("synthetic-local-fixture").toString("base64url")));
    const scenario = claims?.preview_scenario ?? "default";
    if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(200, { keys: [] });
    if (!authenticated)
      return send(401, { error: "Enter through /preview to use the synthetic local account." });
    if (url.pathname === "/auth/v1/user") return send(200, fixtures.user);
    if (url.pathname === "/rest/v1/rpc/is_tracker_member") return send(200, true);
    if (url.pathname === "/rest/v1/rpc/learner_ownership") {
      const cards = fixtureRows(fixtures, "decision_cards", scenario).filter(
        (card) => !card.hidden,
      );
      const sessions = fixtureRows(fixtures, "sessions", scenario);
      const answers = fixtureRows(fixtures, "answers", scenario);
      const reviews = fixtureRows(fixtures, "reviews", scenario);
      const repos = [
        ...new Set(
          sessions
            .filter((session) => cards.some((card) => card.session_id === session.id))
            .map((session) => session.repo),
        ),
      ];
      return send(
        200,
        repos.map((repo) => {
          const ids = new Set(
            cards
              .filter((card) =>
                sessions.some((session) => session.id === card.session_id && session.repo === repo),
              )
              .map((card) => card.id),
          );
          return {
            repo,
            total: ids.size,
            owned: reviews.filter((review) => ids.has(review.card_id) && review.mastered).length,
            explained: new Set(
              answers
                .filter((answer) => ids.has(answer.card_id) && answer.score === 2)
                .map((answer) => answer.card_id),
            ).size,
          };
        }),
      );
    }
    if (url.pathname === "/rest/v1/rpc/learner_repos")
      return send(
        200,
        [
          ...new Set(
            fixtureRows(fixtures, "sessions", scenario)
              .map((row) => row.repo)
              .filter(Boolean),
          ),
        ]
          .sort()
          .map((repo) => ({ repo })),
      );
    if (!url.pathname.startsWith("/rest/v1/"))
      return send(404, { error: "This is a local synthetic fixture server." });
    const table = url.pathname.split("/").at(-1);
    if (!Array.isArray(fixtures[table])) return send(404, { error: "Unknown fixture table." });
    if (table === "cli_device_codes" && access !== "admin")
      return send(403, { code: "42501", message: "Device requests are server-only." });
    let rows;
    let status = 200;
    if (["GET", "HEAD"].includes(request.method)) {
      rows = selectRows(fixtures, table, url.searchParams, scenario, access);
    } else {
      let body;
      try {
        let raw = "";
        for await (const chunk of request) {
          raw += chunk;
          if (raw.length > 100000) throw new Error("Too large");
        }
        body = JSON.parse(raw || "{}");
      } catch {
        return send(400, { error: "Invalid fixture request" });
      }
      const result = mutateFixtures(
        fixtures,
        table,
        request.method,
        url.searchParams,
        body,
        access,
      );
      if (result.error) return send(result.status, result.error);
      rows = result.rows;
      status = result.status;
    }
    const count = rows.length;
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const limit = Math.max(0, Number(url.searchParams.get("limit") ?? count) || 0);
    rows = rows.slice(offset, offset + limit);
    response.setHeader(
      "content-range",
      count ? `${offset}-${offset + Math.max(0, rows.length - 1)}/${count}` : "*/0",
    );
    if (request.method === "HEAD") return response.end();
    const single = request.headers.accept?.includes("vnd.pgrst.object+json");
    return send(status, single ? (rows[0] ?? null) : rows);
  });
}

export async function startDesignPreview({ shareOrigin = null } = {}) {
  const publicOrigin = shareOriginOf(shareOrigin);
  if (process.env.NODE_ENV === "production") throw new Error("Design preview is development only.");
  const appPort = Number(process.env.DESIGN_APP_PORT ?? 3100);
  const fixturePort = Number(process.env.DESIGN_PREVIEW_PORT ?? 54329);
  if (
    ![appPort, fixturePort].every(
      (port) => Number.isInteger(port) && port > 1024 && port < 65536,
    ) ||
    appPort === fixturePort
  )
    throw new Error("Choose two different unprivileged local ports.");
  const webRequire = createRequire(resolve(root, "apps/web/package.json"));
  const { WebSocketServer } = webRequire("next/dist/compiled/ws");
  const sample = JSON.parse(
    readFileSync(resolve(root, "packages/shared/fixtures/session.sample.json"), "utf8"),
  );
  const fixtures = makeFixtures(sample);
  const server = createFixtureServer({
    fixtures,
    appPort,
    fixturePort,
    resetFixtures: () => makeFixtures(sample),
    shareOrigin: publicOrigin,
  });
  const sockets = new WebSocketServer({ server });
  sockets.on("connection", (socket) =>
    socket.on("message", (raw) => {
      const reply = previewSocketReply(raw);
      if (reply) socket.send(reply);
    }),
  );
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(fixturePort, "127.0.0.1", done);
  });
  const child = spawn(
    process.execPath,
    [
      webRequire.resolve("next/dist/bin/next"),
      "dev",
      "--port",
      String(appPort),
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd: resolve(root, "apps/web"),
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        DESIGN_PREVIEW: "1",
        DESIGN_PREVIEW_PORT: String(fixturePort),
        DESIGN_SHARE_ORIGIN: publicOrigin || "",
        NEXT_PUBLIC_DESIGN_SHARE: publicOrigin ? "1" : "",
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-preview-public-key",
        SUPABASE_SERVICE_ROLE_KEY: PREVIEW_SERVICE_KEY,
        NEXT_PUBLIC_SITE_URL: publicOrigin || `http://localhost:${appPort}`,
        MODEL_PROVIDER: "fake",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "",
        CRON_SECRET: "",
        DASHBOARD_API_KEY: "",
        RESEND_API_KEY: "",
      },
    },
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    child.kill("SIGTERM");
    for (const socket of sockets.clients) socket.terminate();
    sockets.close();
    server.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  child.once("exit", (code) => {
    stop();
    process.exitCode = code ?? 0;
  });
  child.once("error", (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });
  console.log(
    `\nWebsite: http://localhost:${appPort}\nDesign preview: http://localhost:${fixturePort}/preview\nUse the Design preview button to switch screens. Synthetic data only; changes reset on restart.\n`,
  );
  return { stop };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  startDesignPreview().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
