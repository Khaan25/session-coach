# Architecture

```
laptop                              server (Vercel + Supabase)                       learner
──────                              ──────────────────────────                       ───────
Claude Code session starts
  └─ SessionStart hook: session-coach sync     (or `session-coach push` by hand)
       redact, gzip
       ① POST metadata ──────────────► /api/sessions ─► sessions(pending), signed upload URL (2 h)
       ② PUT gzip ───────────────────► Storage
       ③ POST ───────────────────────► /api/sessions/[id]/process ─► claim pending → processing
                                          └─ after(): parse → trim → extract → evidence check
                                                └─ decision_cards, sessions(ready) ──Realtime──► dashboard
                                                                                        review: answer first
                                                                   grade 0/1/2 ◄──────── answer
                                                                   reviews(day 1/3/7)
                                            daily cron ─ fail stuck sessions, email ───────► back to review
```

## Why SessionStart sync

`session-coach sync` runs from a SessionStart hook the learner adds to one project's `.claude/settings.json`, so it is
opt-in, project by project. On each start it uploads at most one of that project's logs: one untouched for 10 minutes
or more and modified in the last 7 days, skipping the running session and every id it already sent
(`packages/cli/src/sync.ts`). A SessionEnd hook runs inside a short time budget and can be killed mid-upload; a log
that is quiet at the next start is finished. One log per start keeps model runs apart on the free tier's 8,000
tokens a minute. It prints nothing and never fails the hook. `session-coach push <file>` or `push --latest` uploads by
hand. See DECISIONS.md, 2026-11-03, "`sync` uploads finished sessions from a SessionStart hook".

## Upload: three calls

1. **`POST /api/sessions`** with the session's metadata, never the log. Creates the `pending` row and returns a signed
   upload URL, valid 2 hours (`apps/web/src/app/api/sessions/route.ts`). A repeat gets 409 (see DATA_MODEL.md,
   repeat uploads).
2. **`PUT`** the gzipped, redacted log straight to Storage at that URL, so the log never passes through a function.
3. **`POST /api/sessions/[id]/process`** checks the log is in Storage and its real size, claims the row with a
   compare-and-set from `pending` to `processing`, answers 202, and runs `processSession` in `after()`
   (`apps/web/src/app/api/sessions/[id]/process/route.ts`).

## Pipeline stages

1. **Filter:** keep prompts, agent text, Write/Edit summaries, Bash commands; drop thinking blocks, attachments and
   Read results; cut tool results to 500 characters; redact again (`lib/pipeline/parser.ts`).
2. **Timeline:** number kept events E1, E2, … with a map back to the raw JSONL line.
3. **Big logs:** cap each event at 1,500 characters (`MAX_EVENT_CHARS`), then keep the newest events that fit in
   16,000 characters (`MAX_TIMELINE_CHARS`) and drop older ones whole (`lib/pipeline/process-rows.ts`). Splitting at
   user prompts was rejected (DECISIONS.md, 2026-11-01).
4. **Extract:** one model call returns 0–5 decisions as JSON; a session with none is still `ready` and shows "No
   decisions found". Each card is validated alone with a model-output schema that has the decision fields only
   (`decision`, `why`, `source`, `evidence` without `verified`, `files`, `question`, `model_answer`). The server adds
   ids, `position` and `user_id`; Postgres generates `flagged` and `hidden`. An invalid answer gets one more call,
   then the session is `failed`.
5. **Evidence check (plain code):** the cited event exists and contains the quote, which sets each item's `verified`.
   Cards with no grounded quote are dropped (`lib/pipeline/evidence.ts`). Postgres generates `flagged` and `hidden`
   from `evidence` with the same rule as `getEvidenceFlags()`.

## Review loop

- **Answer first:** a card's why and evidence stay off the page, and out of the learner's column grants, until the
  learner answers or skips.
- **Grading:** `callModel("grade", …)` returns `{ score: 0 | 1 | 2, missing, modelAnswer }` against the card's why,
  evidence and model answer.
- **Schedule:** score 2 moves a card to the next gap (1, 3, 7 days); a miss (0 or 1) drops it one step (never below
  day 1), due tomorrow; "I don't know yet" keeps its step and brings it back tomorrow; passing day 7 sets `mastered`
  (`lib/review/schedule.ts`).
- **5 a day:** each local day offers at most 5 cards, up to 2 of them new (`lib/review/today.ts`).
- **Emails:** Vercel Cron once a day (Hobby fires within the hour). The same run fails sessions stuck in
  `processing`. `email_log` is unique per user, kind and day.
- **Progress:** "decisions you can still explain" = mastered cards + cards scored 2 in the last 7 days.

## Limits we design around

- Vercel Hobby functions run at most 300s, and `after()` work counts inside that limit.
- Hobby cron runs at most once per day.
- The model provider is config: `MODEL_PROVIDER` (`gemini`, `openrouter` or `groq`) and `MODEL_<TASK>`. Production runs
  Groq `openai/gpt-oss-120b` on the free tier (DECISIONS.md, 2026-11-01): 8,000 tokens a minute sets the timeline
  budget and one upload per `sync`. Logs reach a third-party provider, so redaction stays strict.

## CLI login (device code)

```
terminal                                   server                                   browser (signed in)
────────                                   ──────                                   ───────────────────
session-coach login ──POST /api/cli/device──► cli_device_codes(sha256(deviceCode), userCode, 10 min)
  prints WDJB-MJHT, opens /cli/approve?code=WDJB-MJHT ─────────────────────────────► shows device, IP, countdown
  polls /api/cli/device/token (5 s, +5 s per slow_down) ◄── 400 authorization_pending                 Approve ──► approved_by, approved_at
  next poll ◄── 200 { token, email } once: compare-and-set token_issued_at, new cli_tokens row (label = device name)
  saves ~/.session-coach/config.json
```

RFC 8628 with its error codes. The device code is a 32-byte secret stored only as its hash; the user code is 8 letters
from `BCDFGHJKLMNPQRSTVWXZ`. A link with `?code=` never approves by itself: approving takes a click on a page that names
the computer and its IP. `session-coach login --token` keeps the paste-a-token path for machines without a browser.
