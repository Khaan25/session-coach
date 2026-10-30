#!/usr/bin/env node
// Loads believable demo data into the live Supabase project for ONE existing learner, so the
// dashboard, session detail, review queue and progress pages have something real to show.
//
//   node --env-file=apps/web/.env.local scripts/seed-demo.mjs --email you@example.com [flags]
//
//   (no flag)    replace this learner's demo rows with a fresh set
//   --reset      delete exactly the rows in the manifest, children first
//   --simulate   flip the demo pending session to processing then ready (and the processing one
//                to failed) over ~20 s, to watch the Realtime status badge
//   --dry-run    preflight and counts only, no writes (--email optional)
//
// Every row gets a deterministic id (UUID v5 of the learner id and a fixed key), and the ids are
// recorded in scripts/.seed-demo/<user-id>.json. Re-running deletes those ids first, so it never
// duplicates. It never creates auth users, sets passwords, or touches rows it did not write.
// sessions.raw_path is NOT NULL, so demo sessions point at a Storage path with no object behind it.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_DIR = join(ROOT, "scripts", ".seed-demo");
const DAY = 86_400_000;
const GAPS = [null, 1, 3, 7]; // days until the next review after reaching step 1, 2, 3
const NAMESPACE = "6f1c2b3e-8a4d-4f5e-9b7c-0d1e2f3a4b5c"; // fixed: changing it orphans old demo rows

// Demo content -----------------------------------------------------------------------------------

/** One evidence item. verified defaults to true, so the card is visible and not flagged. */
const ev = (event_index, quote, file = null, lines = null, verified = true) => ({
  event_index,
  quote,
  file,
  lines,
  verified,
});

/**
 * Sessions, oldest first. `daysAgo` is when it started; `scores` is a card's answer history
 * (first try, then each review on its due date); a card without scores was never answered.
 */
const SESSIONS = [
  {
    key: "review-schedule",
    repo: "session-coach",
    branch: "zia/review-schedule",
    title: "Add the day 1/3/7 review schedule",
    daysAgo: 20,
    duration: 54,
    events: 488,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Keep one reviews row per card instead of a row per scheduled review",
        why: "The agent said a step and a due date are enough to drive the queue, and future rows would need cleaning up whenever a card resets.",
        evidence: [ev(14, "one row per card is enough: step plus due_on drives the whole queue")],
        files: ["supabase/migrations/20261028000000_init.sql"],
        question: "Why does the schedule keep a single reviews row per card?",
        model_answer:
          "The current step and next due date are all the queue needs; a row per future review would have to be deleted or rewritten every time a score resets the card.",
        scores: [2, 2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Restart a card at day 1 on any score below 2",
        why: "Likely so a half-remembered decision is asked again soon instead of drifting to the day 7 gap.",
        evidence: [
          ev(
            31,
            "if (score < 2) return { step: 1, dueOn: addDays(today, 1) };",
            "apps/web/src/lib/review/schedule.ts",
            [14, 18],
          ),
        ],
        files: ["apps/web/src/lib/review/schedule.ts"],
        question: "What happens to a card scored 1, and why?",
        model_answer:
          "It goes back to day 1 and is asked again tomorrow; a partial answer means the reason is not solid yet, so the longer gaps would let it fade.",
        scores: [1, 2, 2, 2],
      },
      {
        source: "stated",
        decision: "Work out 'due today' in the learner's timezone",
        why: "The user asked that a learner in Kathmandu not see tomorrow's cards at 11 pm UTC.",
        evidence: [ev(6, "due today has to mean the learner's today, not UTC")],
        files: ["apps/web/src/lib/review/queue.ts"],
        question: "Why is due_on compared with the learner's local date?",
        model_answer:
          "A UTC date rolls over at a different hour than the learner's day, so cards would appear or vanish at odd local times; the profile timezone keeps 'today' on the learner's calendar.",
        scores: [2, 0, 2],
      },
    ],
  },
  {
    key: "transcript-parser",
    repo: "rapporteur",
    branch: "main",
    title: "Write transcriptParser.ts",
    daysAgo: 18,
    duration: 42,
    events: 412,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Use ESM imports with .js extensions in the new parser",
        why: "Matches the convention already used in resultSchema.ts.",
        evidence: [ev(2, "matching resultSchema.ts's convention")],
        files: ["server/src/lib/transcriptParser.ts"],
        question: "Why did the agent write imports with .js extensions?",
        model_answer:
          "To stay consistent with how the existing code in the project imports modules.",
        scores: [2, 2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Skip unknown JSONL line types instead of throwing",
        why: "Claude Code adds line types without notice, so one new type should not fail the whole session.",
        evidence: [
          ev(
            9,
            "default: continue; // unknown line type",
            "server/src/lib/transcriptParser.ts",
            [41, 44],
          ),
        ],
        files: ["server/src/lib/transcriptParser.ts"],
        question: "What happens to a line type the parser doesn't know, and why?",
        model_answer:
          "It is skipped, so a Claude Code update that adds a new line type doesn't break parsing for the whole session.",
        scores: [2, 1, 2, 2, 2],
      },
      {
        source: "stated",
        decision: "Stream the log line by line with readline instead of reading it whole",
        why: "The agent noted some logs are over 50 MB and reading them whole spiked the worker's memory.",
        evidence: [ev(17, "some of these logs are 50MB+, so stream them with readline")],
        files: ["server/src/lib/transcriptParser.ts"],
        question: "Why does the parser stream the file instead of reading it in one go?",
        model_answer:
          "Large logs read whole sit in memory at once and spike the worker; streaming keeps memory flat whatever the file size.",
        scores: [2, 2, 2, 2],
      },
    ],
  },
  {
    key: "proration-rounding",
    repo: "billing-api",
    branch: "fix/proration-rounding",
    title: "Fix proration rounding on plan upgrades",
    daysAgo: 16,
    duration: 37,
    events: 296,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Keep money in integer cents through the proration math",
        why: "The user pointed out the float version charged one cent too much on 30-day months.",
        evidence: [
          ev(
            4,
            "keep everything in integer cents until the very end",
            "src/billing/proration.ts",
            [8, 31],
          ),
        ],
        files: ["src/billing/proration.ts"],
        question: "Why does proration stay in integer cents until the end?",
        model_answer:
          "Floating-point dollars round differently at each step, which produced off-by-one-cent charges; integer cents keep every intermediate value exact.",
        scores: [2, 2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Round the prorated amount half to even",
        why: "Probably to avoid a steady upward bias across many invoices; the agent did not say so.",
        evidence: [ev(22, "return roundHalfEven(cents);", "src/billing/proration.ts", [27, 27])],
        files: ["src/billing/proration.ts"],
        question: "Why might the agent have switched to round-half-even?",
        model_answer:
          "Half-up rounding always pushes a half cent upward, so across many invoices customers are overcharged a little; half-even splits those ties evenly.",
        scores: [0, 2, 2],
      },
      {
        // Flagged: one quote was found in the log, the other was not (verified: false).
        source: "stated",
        decision: "Add a regression test for an upgrade in a 31-day month",
        why: "The user said the 31-day case is the one that broke in production.",
        evidence: [
          ev(26, "add a test for the 31-day case", "test/proration.test.ts", [40, 58]),
          ev(27, "this is exactly the invoice that broke in prod last week", null, null, false),
        ],
        files: ["test/proration.test.ts"],
        question: "Why does the new test use a 31-day month?",
        model_answer:
          "That month length is where the rounding bug showed up in production, so the test pins the exact case that failed.",
        scores: [1, 2, 2, 2, 2],
      },
    ],
  },
  {
    key: "upload-route",
    repo: "session-coach",
    branch: "kasam/upload-route",
    title: "Build the session upload route",
    daysAgo: 13,
    duration: 61,
    events: 534,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Return 409 when the same Claude Code session is uploaded twice",
        why: "The agent relied on the unique (user_id, external_id) constraint so the hook can retry safely.",
        evidence: [
          ev(
            11,
            "a repeat upload hits the unique constraint, so map 23505 to 409",
            "apps/web/src/app/api/sessions/route.ts",
            [52, 58],
          ),
        ],
        files: ["apps/web/src/app/api/sessions/route.ts"],
        question: "Why does a repeat upload return 409 instead of creating a second row?",
        model_answer:
          "The database allows one row per learner and Claude Code session id; turning that violation into 409 lets the CLI hook retry without creating duplicates.",
        scores: [2, 2, 2, 2],
      },
      {
        source: "stated",
        decision: "Store only a sha256 hash of each CLI token",
        why: "The user said a database leak must not hand out working tokens.",
        evidence: [
          ev(19, "store sha256(token), never the raw token", "apps/web/src/lib/cli-token.ts"),
        ],
        files: ["apps/web/src/lib/cli-token.ts"],
        question: "Why is the CLI token stored as a hash?",
        model_answer:
          "If the table leaks, a hash can't be used to upload as the learner; the server hashes the presented token and compares, so it never needs the raw value.",
        scores: [2, 2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Gzip the redacted log before uploading it to Storage",
        why: "Likely to cut upload time and Storage use, since text logs compress well.",
        evidence: [ev(23, "createGzip()", "packages/cli/src/upload.ts", [20, 26])],
        files: ["packages/cli/src/upload.ts"],
        question: "Why is the log gzipped before upload?",
        model_answer:
          "JSONL logs are repetitive text that shrinks several times over, so uploads are faster and Storage holds less.",
      },
    ],
  },
  {
    key: "stripe-webhooks",
    repo: "billing-api",
    branch: "feat/stripe-webhooks",
    title: "Verify Stripe webhook signatures",
    daysAgo: 11,
    duration: 48,
    events: 371,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Read the raw request body before verifying the Stripe signature",
        why: "The agent found that parsing JSON first changes the bytes, so every signature check failed.",
        evidence: [
          ev(
            8,
            "constructEvent needs the raw body, not the parsed JSON",
            "src/routes/webhooks/stripe.ts",
            [12, 19],
          ),
        ],
        files: ["src/routes/webhooks/stripe.ts"],
        question: "Why does the webhook read the raw body instead of parsed JSON?",
        model_answer:
          "Stripe signs the exact bytes it sent; parsing and re-serialising JSON changes whitespace and key order, so the signature would never match.",
        scores: [2, 2, 2],
      },
      {
        source: "stated",
        decision: "Make webhook handling idempotent on event.id",
        why: "The user mentioned Stripe retries deliveries, and a retried invoice.paid must not credit twice.",
        evidence: [ev(15, "Stripe retries, so dedupe on event.id before touching balances")],
        files: ["src/routes/webhooks/stripe.ts", "migrations/0012_processed_events.sql"],
        question: "Why does the handler record event.id before changing balances?",
        model_answer:
          "Stripe can deliver the same event more than once; checking the id first means a retry is ignored instead of crediting the account twice.",
        scores: [2, 2, 1, 2, 2],
      },
      {
        source: "inferred",
        decision: "Return 200 for event types the handler ignores",
        why: "Probably so Stripe stops retrying events the app doesn't care about.",
        evidence: [
          ev(
            21,
            "default: return res.status(200).end();",
            "src/routes/webhooks/stripe.ts",
            [64, 65],
          ),
        ],
        files: ["src/routes/webhooks/stripe.ts"],
        question: "Why answer 200 to events the app doesn't handle?",
        model_answer:
          "Any non-2xx response makes Stripe retry for days; acknowledging ignored types stops the retries and keeps the dashboard free of false failures.",
        scores: [2, 1, 2, 2, 2],
      },
    ],
  },
  {
    key: "pdf-export",
    repo: "rapporteur",
    branch: "feat/pdf-export",
    title: "Add PDF export for weekly reports",
    daysAgo: 9,
    duration: 73,
    events: 655,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Render the PDF from the existing HTML report with Playwright",
        why: "The agent chose to reuse the report template rather than draw a second layout with a PDF library.",
        evidence: [
          ev(12, "reuse the HTML report and print it with page.pdf()", "server/src/export/pdf.ts"),
        ],
        files: ["server/src/export/pdf.ts"],
        question: "Why print the HTML report instead of building the PDF with a PDF library?",
        model_answer:
          "The HTML report already has the layout and styles; printing it keeps one template, so the PDF never drifts from what users see on screen.",
        scores: [2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Generate PDFs in a queue job, not in the request",
        why: "Probably because rendering takes several seconds and would time out the API request.",
        evidence: [
          ev(
            30,
            "await queue.add('export-pdf', { reportId });",
            "server/src/routes/export.ts",
            [18, 18],
          ),
        ],
        files: ["server/src/routes/export.ts"],
        question: "Why is the PDF built in a background job?",
        model_answer:
          "Starting a browser and rendering takes seconds, longer than a request should wait; the job runs it in the background and the user is notified when it's ready.",
        scores: [2, 1, 2, 2],
      },
      {
        // Hidden: no quote was found in the log, so learners never see it (kept for the accuracy check).
        source: "stated",
        decision: "Embed the report fonts in the PDF",
        why: "The agent said system fonts on the server differ from the browser's.",
        evidence: [ev(41, "embed the fonts or the server falls back to DejaVu", null, null, false)],
        files: ["server/src/export/pdf.ts"],
        question: "Why are fonts embedded in the PDF?",
        model_answer:
          "The server lacks the fonts the browser uses, so without embedding the PDF falls back to a different font and the layout shifts.",
      },
    ],
  },
  {
    key: "realtime-badge",
    repo: "session-coach",
    branch: "zia/realtime-badge",
    title: "Live status badge with Supabase Realtime",
    daysAgo: 6,
    duration: 29,
    events: 244,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Subscribe to sessions changes filtered by user_id",
        why: "The agent said RLS already limits the rows, but the filter stops the channel receiving events it would drop.",
        evidence: [
          ev(
            7,
            "filter: `user_id=eq.${userId}` so we only get our own rows",
            "apps/web/src/components/app/session-status-badge.tsx",
            [21, 27],
          ),
        ],
        files: ["apps/web/src/components/app/session-status-badge.tsx"],
        question: "Why filter the Realtime subscription by user_id when RLS already applies?",
        model_answer:
          "RLS decides what may be delivered, but the filter narrows what the server even considers, so the client gets fewer events and none it would throw away.",
        scores: [2, 2, 2],
      },
      {
        source: "inferred",
        decision: "Refresh the session list on a status change instead of patching it locally",
        why: "Likely to keep card counts right, since cards only exist once the pipeline finishes.",
        evidence: [
          ev(13, "router.refresh();", "apps/web/src/components/app/session-list.tsx", [44, 44]),
        ],
        files: ["apps/web/src/components/app/session-list.tsx"],
        question: "Why refresh the list instead of updating the one row's status?",
        model_answer:
          "A session turning ready also gains cards; refreshing re-reads the counts from the server, where patching the status alone would leave them stale.",
        scores: [2],
      },
      {
        source: "stated",
        decision: "Remove the channel when the badge unmounts",
        why: "The user noticed duplicate events after navigating back and forth.",
        evidence: [
          ev(
            19,
            "return () => { supabase.removeChannel(channel); };",
            "apps/web/src/components/app/session-status-badge.tsx",
            [30, 32],
          ),
        ],
        files: ["apps/web/src/components/app/session-status-badge.tsx"],
        question: "What went wrong before the channel was removed on unmount?",
        model_answer:
          "Each visit opened another subscription without closing the old one, so every status change arrived several times.",
        scores: [2, 2, 2],
      },
    ],
  },
  {
    key: "invoice-emails",
    repo: "billing-api",
    branch: "feat/invoice-emails",
    title: "Send invoice emails through Resend",
    daysAgo: 4,
    duration: 33,
    events: 268,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision: "Send the invoice email after the transaction commits",
        why: "The user said a rolled-back invoice must never produce an email.",
        evidence: [ev(10, "send after commit, otherwise a rollback still emails the customer")],
        files: ["src/billing/invoices.ts"],
        question: "Why is the email sent after the commit and not inside the transaction?",
        model_answer:
          "An email can't be rolled back; sending it only after the commit means customers never get an invoice that the database then discarded.",
        scores: [2, 2],
      },
      {
        source: "inferred",
        decision: "Use the invoice id as the Resend idempotency key",
        why: "Likely so a retried job doesn't email the customer twice.",
        evidence: [ev(16, "'Idempotency-Key': invoice.id", "src/email/send-invoice.ts", [22, 22])],
        files: ["src/email/send-invoice.ts"],
        question: "What does the idempotency key protect against?",
        model_answer:
          "If the job retries after a timeout, Resend sees the same key and doesn't send the email a second time.",
      },
    ],
  },
  {
    key: "vercel-cron",
    repo: "rapporteur",
    branch: "chore/vercel-cron",
    title: "Migrate the nightly cron to Vercel",
    daysAgo: 2,
    duration: 64,
    events: 37,
    status: "failed",
    error:
      "We couldn't find any decisions in this session: almost everything in it was tool output. Try a longer session where the agent explains its choices.",
    cards: [],
  },
  {
    key: "progress-page",
    repo: "session-coach",
    branch: "zia/progress-page",
    title: "Progress page streak and mastered count",
    daysAgo: 1,
    duration: 46,
    events: 397,
    status: "ready",
    cards: [
      {
        source: "stated",
        decision:
          "Count 'decisions you can still explain' as mastered cards plus cards scored 2 in the last 7 days",
        why: "The agent wanted the number to drop when a learner stops reviewing, not only grow.",
        evidence: [ev(5, "mastered + scored 2 in the last 7 days, so it can go down")],
        files: ["apps/web/src/lib/progress.ts"],
        question: "Why does the headline count include only recent 2s, not every 2 ever?",
        model_answer:
          "Counting every past 2 would only ever grow; limiting it to the last 7 days plus mastered cards lets the number fall when the learner stops reviewing, which is the honest signal.",
        scores: [2],
      },
      {
        source: "inferred",
        decision: "Compute the streak in SQL with a window over answer dates",
        why: "Probably to avoid pulling every answer into the server just to count days.",
        evidence: [
          ev(18, "row_number() over (order by d)", "supabase/functions/streak.sql", [3, 12]),
        ],
        files: ["supabase/functions/streak.sql"],
        question: "Why compute the streak in the database?",
        model_answer:
          "The database can group answers by day and find the current run in one query, instead of sending every answer to the server to count.",
      },
      {
        source: "stated",
        decision: "Show an empty state instead of a flat chart for new learners",
        why: "The user said a chart of zeros looks broken.",
        evidence: [ev(24, "no answers yet: show the empty state, not a flat line")],
        files: ["apps/web/src/app/(app)/progress/page.tsx"],
        question: "Why not draw the chart when there are no answers?",
        model_answer:
          "A line stuck at zero reads as a bug; an empty state explains what will appear and how to get there.",
        scores: [0],
      },
    ],
  },
  {
    key: "usage-metering",
    repo: "billing-api",
    branch: "feat/usage-metering",
    title: "Meter API usage per workspace",
    hoursAgo: 3,
    duration: 51,
    events: 433,
    status: "processing",
    cards: [],
  },
  {
    // --simulate flips this one to processing, then ready, then inserts its cards.
    key: "cli-hook",
    repo: "session-coach",
    branch: "kasam/cli-hook",
    title: null,
    hoursAgo: 1,
    duration: 22,
    events: 189,
    status: "pending",
    cards: [],
    simulatedCards: [
      {
        source: "stated",
        decision: "Run the upload from a SessionEnd hook instead of a background watcher",
        why: "The agent said the hook fires once with the transcript path, so nothing has to poll.",
        evidence: [ev(6, "SessionEnd gives us transcript_path, no need to watch the folder")],
        files: ["packages/cli/src/hook.ts"],
        question: "Why upload from the SessionEnd hook?",
        model_answer:
          "The hook runs exactly once when the session ends and receives the transcript path, so there is no watcher to keep alive and no half-written file to read.",
      },
      {
        source: "inferred",
        decision: "Exit 0 from the hook even when the upload fails",
        why: "Likely so a network problem never blocks the user's Claude Code session from closing.",
        evidence: [
          ev(
            15,
            "catch (error) { log(error); process.exit(0); }",
            "packages/cli/src/hook.ts",
            [48, 51],
          ),
        ],
        files: ["packages/cli/src/hook.ts"],
        question: "Why does the hook exit 0 when the upload fails?",
        model_answer:
          "A failing hook can interrupt the user's session; the upload is best effort, so it logs the error and lets the session close normally.",
      },
    ],
  },
];

// Ids and dates --------------------------------------------------------------------------------

/** UUID v5 (RFC 9562) of `name` in NAMESPACE: same input, same id, on every run. */
function uuidv5(name) {
  const ns = Buffer.from(NAMESPACE.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** YYYY-MM-DD of `date` in `timeZone`. */
const localDate = (date, timeZone) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
const addDays = (ymd, days) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** Noon on a calendar date in the learner's zone, so the instant falls on that date there (UTC+13 included). */
function localNoon(ymd, timeZone) {
  const guess = Date.parse(`${ymd}T12:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(guess)
      .map(({ type, value }) => [type, Number(value)]),
  );
  const offset = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - guess;
  return guess - offset;
}

/** A decision_cards row for a demo card. Ids derive from the learner, session key and position, so reruns match. */
function cardRow(userId, session, card, position, createdAt) {
  return {
    id: uuidv5(`${userId}:card:${session.key}:${position}`),
    session_id: uuidv5(`${userId}:session:${session.key}`),
    user_id: userId,
    position,
    decision: card.decision,
    why: card.why,
    source: card.source,
    evidence: card.evidence,
    files: card.files,
    question: card.question,
    model_answer: card.model_answer,
    created_at: createdAt,
  };
}

/** A plausible learner answer for a score: the model answer for 2, half of it for 1, "Not sure." for 0. */
function learnerAnswer(card, score) {
  if (score === 2) return { answer: card.model_answer, missing: null };
  if (score === 1) {
    return {
      answer: `${card.model_answer.split(/[;,] /)[0]}.`,
      missing: `You said what it does but not why: ${card.why}`,
    };
  }
  return { answer: "Not sure.", missing: card.why };
}

/**
 * Builds every demo row for one learner. Answers replay the card's score history on the day
 * 1/3/7 schedule (score 2 moves up a step, below 2 restarts at day 1, passing day 7 masters it).
 * Reviews happen on their due date while it is before today; a due date left in the past is
 * moved to today, so the queue shows it as due rather than overdue.
 */
function buildRows(userId, now, timeZone) {
  const today = localDate(now, timeZone);
  const rows = { sessions: [], decision_cards: [], answers: [], reviews: [], simulatedCards: [] };

  for (const session of SESSIONS) {
    const startedMs = session.hoursAgo
      ? now.getTime() - session.hoursAgo * 3_600_000
      : Date.parse(`${addDays(today, -session.daysAgo)}T05:30:00Z`);
    const createdMs = Math.min(startedMs + (session.duration + 2) * 60_000, now.getTime() - 60_000);
    const externalId = uuidv5(`${userId}:external:${session.key}`);
    rows.sessions.push({
      id: uuidv5(`${userId}:session:${session.key}`),
      user_id: userId,
      external_id: externalId,
      agent: "claude-code",
      title: session.title,
      repo: session.repo,
      branch: session.branch,
      started_at: new Date(startedMs).toISOString(),
      duration_min: session.duration,
      event_count: session.events,
      raw_path: `${userId}/${externalId}.jsonl.gz`, // no object: demo sessions have no log
      status: session.status,
      error: session.error ?? null,
      created_at: new Date(createdMs).toISOString(),
    });

    session.cards.forEach((card, position) => {
      const cardCreated = new Date(createdMs + 60_000 + position * 1000).toISOString();
      const row = cardRow(userId, session, card, position, cardCreated);
      rows.decision_cards.push(row);
      if (!card.scores?.length) return;

      let step = 0;
      let dueOn = null;
      let lastScore = null;
      let answeredMs = Math.min(createdMs + 3_600_000, now.getTime() - 300_000);
      for (const [index, score] of card.scores.entries()) {
        if (index > 0) {
          if (dueOn === null || dueOn >= today) break; // mastered, or not due before today
          answeredMs = localNoon(dueOn, timeZone);
        }
        rows.answers.push({
          id: uuidv5(`${userId}:answer:${session.key}:${position}:${index}`),
          card_id: row.id,
          user_id: userId,
          review_step: step,
          ...learnerAnswer(card, score),
          score,
          created_at: new Date(answeredMs).toISOString(),
        });
        lastScore = score;
        const answeredOn = localDate(new Date(answeredMs), timeZone);
        if (score === 2 && step === 3) {
          step = 3;
          dueOn = null;
        } else {
          step = score === 2 ? step + 1 : 1;
          dueOn = addDays(answeredOn, GAPS[step]);
        }
      }
      rows.reviews.push({
        card_id: row.id,
        user_id: userId,
        step,
        due_on: dueOn === null ? null : dueOn < today ? today : dueOn,
        last_score: lastScore,
        mastered: dueOn === null,
        updated_at: new Date(answeredMs).toISOString(),
      });
    });

    (session.simulatedCards ?? []).forEach((card, position) => {
      rows.simulatedCards.push(cardRow(userId, session, card, position, null));
    });
  }

  selfCheck(rows, today);
  return rows;
}

/** The same rules the database enforces, checked before anything is sent. */
function selfCheck(rows, today) {
  for (const card of [...rows.decision_cards, ...rows.simulatedCards]) {
    assert.ok(card.evidence.length > 0, card.decision);
    for (const item of card.evidence) {
      assert.equal(typeof item.verified, "boolean");
      assert.ok(item.event_index > 0 && item.quote.length > 0);
      if (item.lines) assert.ok(item.lines[0] <= item.lines[1]);
    }
  }
  for (const review of rows.reviews) {
    assert.equal(review.mastered, review.due_on === null);
    assert.ok(review.step >= 0 && review.step <= 3);
    if (review.due_on) assert.ok(review.due_on >= today);
  }
  for (const answer of rows.answers) assert.ok([0, 1, 2].includes(answer.score));
  const ids = [...rows.sessions, ...rows.decision_cards, ...rows.answers].map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate deterministic id");
}

/** The counts printed after a seed or a dry run, so the person running it sees what the pages will show. */
function summarize(rows, today) {
  const cards = rows.decision_cards;
  const hidden = cards.filter((card) => !card.evidence.some((item) => item.verified));
  const flagged = cards.filter((card) => card.evidence.some((item) => !item.verified));
  const reviewed = new Set(rows.reviews.map((review) => review.card_id));
  const byStatus = Object.groupBy(rows.sessions, (session) => session.status);
  const count = (list) => list?.length ?? 0;
  return [
    `sessions        ${rows.sessions.length} (ready ${count(byStatus.ready)}, processing ${count(byStatus.processing)}, pending ${count(byStatus.pending)}, failed ${count(byStatus.failed)}) across ${new Set(rows.sessions.map((s) => s.repo)).size} repos`,
    `decision_cards  ${cards.length} (stated ${cards.filter((c) => c.source === "stated").length}, inferred ${cards.filter((c) => c.source === "inferred").length}; flagged ${flagged.length - hidden.length}, hidden ${hidden.length}) + ${rows.simulatedCards.length} added by --simulate`,
    `answers         ${rows.answers.length} (score 2: ${rows.answers.filter((a) => a.score === 2).length}, 1: ${rows.answers.filter((a) => a.score === 1).length}, 0: ${rows.answers.filter((a) => a.score === 0).length})`,
    `reviews         ${rows.reviews.length} (mastered ${rows.reviews.filter((r) => r.mastered).length}, due today ${rows.reviews.filter((r) => r.due_on === today).length}, due later ${rows.reviews.filter((r) => r.due_on > today).length})`,
    `never answered  ${cards.filter((c) => !reviewed.has(c.id)).length - hidden.length} visible cards (in the queue if from the last 7 days)`,
  ].join("\n");
}

// Database ---------------------------------------------------------------------------------------

/** A service-role client: demo rows include answers, reviews and cards, which learners can't write. */
async function connect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run with node --env-file=apps/web/.env.local.",
    );
  }
  // No new dependency: use the copy apps/web already installs.
  const require = createRequire(join(ROOT, "apps", "web", "package.json"));
  const { createClient } = await import(
    pathToFileURL(require.resolve("@supabase/supabase-js")).href
  );
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Read-only: the auth_profiles migration must be live, since it adds profiles.display_name. */
async function preflight(db) {
  const { error } = await db.from("profiles").select("id, display_name, timezone").limit(1);
  if (error) {
    fail(
      `Preflight failed: profiles.display_name is not selectable (${error.message}). Migration 20261029000000_auth_profiles is probably not applied to the live project. Apply it through the normal migration flow first; this script does not run supabase db push.`,
    );
  }
  console.log(
    "preflight       ok: 20261029000000_auth_profiles is applied (profiles.display_name exists)",
  );
}

/** The existing auth user for an address. Pages through every user, since the admin API has no lookup by email. */
async function findUser(db, email) {
  const wanted = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) fail(`Could not list auth users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === wanted);
    if (user) return user;
    if (data.users.length < perPage) break;
  }
  fail(`No account for ${email}. Sign up in the app with that address first, then run this again.`);
}

/** The learner's profile; its time zone decides which day is "today" for due dates. */
async function loadProfile(db, userId) {
  const { data, error } = await db
    .from("profiles")
    .select("id, timezone")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail(`Could not read the profile: ${error.message}`);
  if (!data) fail("The account exists but has no profiles row, so demo rows can't reference it.");
  return data;
}

/** Stops the run on a failed query, naming the step. */
function check({ error }, what) {
  if (error) fail(`${what}: ${error.message}`);
}

/** Deletes demo rows by id, children first, always scoped to the learner. */
async function deleteRows(db, userId, ids) {
  const steps = [
    ["answers", "id", ids.answers],
    ["reviews", "card_id", ids.reviews],
    ["decision_cards", "id", ids.decision_cards],
    ["sessions", "id", ids.sessions],
  ];
  for (const [table, column, list] of steps) {
    if (!list?.length) continue;
    check(await db.from(table).delete().in(column, list).eq("user_id", userId), `delete ${table}`);
  }
}

/** Every id a seed writes, by table, as the manifest stores them. Reviews are keyed by card id. */
function idsOf(rows) {
  return {
    sessions: rows.sessions.map((row) => row.id),
    decision_cards: [...rows.decision_cards, ...rows.simulatedCards].map((row) => row.id),
    answers: rows.answers.map((row) => row.id),
    reviews: [...rows.decision_cards, ...rows.simulatedCards].map((row) => row.id),
  };
}

const manifestPath = (userId) => join(MANIFEST_DIR, `${userId}.json`);

/** The ids the last seed wrote for this learner, or null when there is no manifest. */
function readManifest(userId) {
  const path = manifestPath(userId);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).ids : null;
}

/** Union of the manifest and this version's ids, so rows from an older content set go too. */
function mergeIds(a, b) {
  const out = {};
  for (const key of Object.keys(b)) out[key] = [...new Set([...(a?.[key] ?? []), ...b[key]])];
  return out;
}

/**
 * Replaces the learner's demo rows: deletes old and current ids, writes the manifest, then inserts parents first.
 * The manifest goes first, so --reset can find the rows of a run that fails part way.
 */
async function seed(db, userId, rows) {
  await deleteRows(db, userId, mergeIds(readManifest(userId), idsOf(rows)));
  mkdirSync(MANIFEST_DIR, { recursive: true });
  writeFileSync(
    manifestPath(userId),
    `${JSON.stringify({ user_id: userId, seeded_at: new Date().toISOString(), ids: idsOf(rows) }, null, 2)}\n`,
  );
  check(await db.from("sessions").insert(rows.sessions), "insert sessions");
  check(await db.from("decision_cards").insert(rows.decision_cards), "insert decision_cards");
  check(await db.from("answers").insert(rows.answers), "insert answers");
  check(await db.from("reviews").insert(rows.reviews), "insert reviews");
  console.log(`seeded          manifest at ${manifestPath(userId)}`);
}

/** Deletes exactly the rows the manifest lists, then the manifest. */
async function reset(db, userId) {
  const ids = readManifest(userId);
  if (!ids) {
    console.log(`Nothing to reset: no manifest at ${manifestPath(userId)}.`);
    return;
  }
  await deleteRows(db, userId, ids);
  rmSync(manifestPath(userId));
  console.log("reset           deleted the manifest's rows and the manifest");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Walks two demo sessions through the pipeline's statuses with pauses, so the dashboard's Realtime badges and toasts
 * can be watched without the CLI or the pipeline. Leaves them changed; seeding again restores them.
 */
async function simulate(db, userId, rows) {
  const pending = rows.sessions.find((session) => session.status === "pending");
  const processing = rows.sessions.find((session) => session.status === "processing");
  const { data, error } = await db
    .from("sessions")
    .select("id")
    .in("id", [pending.id, processing.id])
    .eq("user_id", userId);
  if (error) fail(`read demo sessions: ${error.message}`);
  if (data.length < 2) fail("Demo sessions not found. Run the seed first (without --simulate).");

  const set = async (session, patch, label) => {
    check(
      await db.from("sessions").update(patch).eq("id", session.id).eq("user_id", userId),
      label,
    );
    console.log(`${new Date().toLocaleTimeString()}  ${session.repo}/${session.branch}  ${label}`);
  };
  const simIds = rows.simulatedCards.map((card) => card.id);
  check(
    await db.from("decision_cards").delete().in("id", simIds).eq("user_id", userId),
    "clear cards",
  );
  await set(pending, { status: "pending", error: null }, "pending");
  await set(processing, { status: "processing", error: null }, "processing");
  await sleep(4000);
  await set(pending, { status: "processing" }, "pending -> processing");
  await sleep(8000);
  await set(
    processing,
    {
      status: "failed",
      error:
        "The session log couldn't be read: the upload was cut off. Run the upload again from the CLI.",
    },
    "processing -> failed",
  );
  await sleep(8000);
  const now = new Date().toISOString();
  check(
    await db
      .from("decision_cards")
      .insert(rows.simulatedCards.map((card) => ({ ...card, created_at: now }))),
    "insert cards",
  );
  await set(pending, { status: "ready" }, `processing -> ready (${simIds.length} cards)`);
  console.log("Done. Run the seed again to put both sessions back.");
}

/** Prints the message and exits 1. */
function fail(message) {
  console.error(message);
  process.exit(1);
}

// Main -------------------------------------------------------------------------------------------

const { values: flags } = parseArgs({
  options: {
    email: { type: "string" },
    reset: { type: "boolean", default: false },
    simulate: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});
if (flags.reset && flags.simulate) fail("Pass --reset or --simulate, not both.");
if (!flags.email && !flags["dry-run"]) {
  fail("Usage: seed-demo.mjs --email <address> [--reset | --simulate | --dry-run]");
}

const now = new Date();
const db = await connect();
await preflight(db);

let userId = "00000000-0000-0000-0000-000000000000"; // dry run without --email: counts only
let timeZone = "UTC";
if (flags.email) {
  const user = await findUser(db, flags.email);
  userId = user.id;
  timeZone = (await loadProfile(db, userId)).timezone;
  console.log(`learner         ${flags.email} (${userId}, ${timeZone})`);
}
const rows = buildRows(userId, now, timeZone);

if (flags["dry-run"]) {
  console.log(summarize(rows, localDate(now, timeZone)));
  console.log("dry run         nothing written");
} else if (flags.reset) {
  await reset(db, userId);
} else if (flags.simulate) {
  await simulate(db, userId, rows);
} else {
  await seed(db, userId, rows);
  console.log(summarize(rows, localDate(now, timeZone)));
}
