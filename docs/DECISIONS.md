# Decisions

Newest first. Each entry: what we decided, why, and what we rejected.

## 2026-11-05 · A session with no decisions says why and what to do

- **Decision:** copy only. A ready session with 0 visible cards shows "No decisions" as the short marker (sidebar, dashboard row) and, on /s/[id], the headline "No decisions to learn from this session." with a reason (mostly edits and commands, or we missed one) and a next step (ask the agent to explain why it picked an approach, and state reasons in prompts). The failed state is untouched: `status === "failed"` is its own branch, separate from `cards.length === 0`.
- **Why:** "No cards to show" and "No decisions found" said what happened but not why, or how to get cards next time.
- **Rejected:** passing `cardCount` to the header badge on /s/[id] (it still says "Ready"; a logic change, out of scope here).
- Supersedes the wording in the 2026-11-03 entry "A ready session with no cards says 'No decisions found'"; the rule it describes is unchanged.

## 2026-11-05 · The canvas renders the real components; the app follows the picked designs

- **Decision:** the picked options on /canvas are the source of truth for their routes (dashboard B, defend C,
  progress C, settings A, CLI approve C, auth B over the art, how-it-works B, pricing C), and each route and its canvas
  item now render the same component (`DashboardView`, `DefendStart`/`DefendTimed`/`DefendResult`, `ProgressSummary`,
  `SettingsView`, `ApproveRequest`, the auth forms and `auth-screens.tsx`, the marketing route components). /s/[id]
  and /review keep their #76 pages, and the canvas draws those (`SessionView`, `QuizAnswer`/`QuizResult`).
- **Decision:** on the canvas, real controls run under `DryRunContext` (set by every canvas frame): Server Actions
  and routes are swapped for no-ops, so a signed-in teammate clicking Save, Disconnect, Delete or Sign out on /canvas
  never touches their own account. `QuizSendContext` and `AuthPreviewContext` let the canvas hold a quiz grade or an
  auth answer without the API. Route modules, the landing page and the email are rendered by `app/canvas/page.tsx` on
  the server and handed down (`ServerScreens`), since a client module can't import a page that exports metadata.
- **Why:** the hand-built previews drifted within days of the designs being picked (#74 to #79). One component per
  screen can't drift.
- **Rejected:** keeping canvas copies and diffing them by hand; copying option copy that no longer matches the code
  (how-it-works keeps its accurate notes and terminal, and #75's sign-up CTA).

## 2026-11-05 · Upload each session when it ends, retry from the web

- **Decision:** `session-coach init` (CLI 0.4.0) writes the `sync` hooks into the project's `.claude/settings.local.json`, pinned to its own version: SessionStart as before, plus SessionEnd. From SessionEnd, `sync` re-spawns itself detached with the hook's JSON in `SESSION_COACH_HOOK_INPUT` and exits, and the copy uploads only the session that ended (same cwd check, no quiet window). `/setup` and the setup prompt run `init` instead of hand-merging JSON. `push --latest` run inside Claude Code (`CLAUDECODE` set) skips logs written in the last minute, so the setup prompt's first upload is a finished session, not the setup chat.
- **Why:** with SessionStart alone a session uploaded only when the next one started in the same project, often days later or never. `settings.local.json` keeps the hook off teammates' machines; the old prompt put it in the committed `settings.json`.
- **Decision:** a failed session, or one stuck in `processing` or `pending` past `STUCK_MS`, gets a Try again button on its page (`POST /api/sessions/[id]/retry`, cookie auth). The log is still in Storage, so the run restarts from it with the same claim-and-delete-cards steps as a re-push. The daily sweep now also fails `pending` rows past `STUCK_MS`, timed from the latest upload URL: `POST /api/sessions` sets `processing_started_at` when it hands a pending or reset repeat a fresh URL, and a first upload counts from `created_at`. Reusing that column avoids a migration; a dedicated `upload_started_at` would read more clearly if the column's double meaning ever confuses.
- **Decision:** a new account adopts the browser's time zone while its profile still says UTC, the learner hasn't saved a time zone in Settings, and it is under a day old (`adoptBrowserTimezone`); after that only Settings changes it. A Settings save sets `timezone_chosen: true` in the auth user's `user_metadata`, so an explicit UTC choice is kept; that flag avoids a `profiles` column and its migration.
- **Rejected:** a user-level hook for every project (uploads projects nobody opted in); retrying from the CLI only (the learner rarely knows the log's path); setting the time zone on every visit (would undo a deliberate UTC choice).
- **Consequence:** the setup prompt calls `npx session-coach@latest init`, so 0.4.0 must be on npm before this deploys.

## 2026-11-05 · Public ownership report: quotes shown, flagged cards out, repos opt-in

- **Decision:** `/r/[slug]` lists owned (mastered) cards with the decision, the first verified evidence quote, its
  file and the owned and defended dates. Flagged cards are left out as well as hidden ones. Each repo is off the page
  until the learner ticks it (`projects.report_shown`, default false). The slug is 32 random hex characters, and a
  learner can replace it ("Make a new link") but never choose it.
- **Why:** quotes come from the learner's own redacted session log and are what makes a decision credible to a
  reviewer, so they stay, and the settings card says plainly that decisions and quotes from ticked repos become
  public. A flagged card has an unverified quote, which shouldn't be shown to strangers as evidence. Repos default off
  because a learner's work repo may be private; turning the report on shouldn't publish it.
- **Rejected:** a slug from the name (the canvas's `sam-rivera-7k2p`: guessable); per-repo defaults on (publishes
  private work by accident); showing per-repo counts in settings (`learner_ownership()` counts flagged cards, so they
  wouldn't match the page).

## 2026-11-04 · Model-written session titles

- **Decision:** the extraction model writes the session title in the same call that makes the cards: the answer gains a top-level `title` string, one plain line under 70 characters, required even when there are no decisions. It is optional on our side: a missing, blank or non-string title is ignored and the cards are kept exactly as before; a long one is cut to the title limit with "…". `processSession` uses it when the session has no title yet and falls back to the first prompt (`sessionTitle`) when the model gave none. An existing title is never overwritten. The title rules add a little to each extract call.
- **Why:** first prompts are mostly instructions to the agent ("plan only, do not edit…"), so titles built from them confused learners.
- **Rejected:** the first card's decision as the title (a session with zero cards would have none); a separate title call (extra tokens on Groq's 8,000 tokens/minute).
- **Consequence:** sessions processed before this keep their first-prompt title; only new sessions get a model-written one.

## 2026-11-05 · Ownership meter: bars fill by explained, no-repo sessions are "No project"

- **Decision:** the dashboard meter's bars fill with explained cards (answered 2 at least once); the text shows both
  ("Explained 9 · owned 2 of 30"). Cards from sessions with no repo are one "No project" row, last and not linked,
  because `?repo=` filters by name and a null repo isn't a project (`learner_repos()` skips it). The server component
  reads the data directly; no `GET /api/progress/ownership` yet, since nothing calls it and `ownedThisWeek` needs a
  mastered-at time `reviews` doesn't store. The counting is one SQL function, `learner_ownership()`, run as the learner,
  so the page reads one row per repo instead of every card, review and answer.
- **Why:** no card is mastered before about 14 Nov (review ladder entry), so an owned bar would sit empty on demo day.
- **Rejected:** hiding no-repo cards (the overall total would not add up); a `?repo=none` filter (a value a real repo
  could be called); counting in the app from four full reads (fine at trial scale, but it grows with every answer).

## 2026-11-05 · Generated Supabase types

- **Decision:** `apps/web/src/lib/supabase/database.types.ts` is generated by `supabase gen types typescript --local` and passed to `createClient<Database>`. It replaces the hand-written `.maybeSingle<{...}>()` row casts. CI's rls job regenerates it and fails on drift. Zia approved.
- **Why:** a hand-typed row can say a column exists, or is non-null, when the migration says otherwise, and nothing checks it.
- **Rejected:** hand-typed rows (drift); a types package in `packages/shared` (shared contract churn on every migration).

## 2026-11-05 · Route helpers return `T | Response`

- **Decision:** `apps/web/src/lib/api/http.ts` exports `requireUser`, `requireCliUser`, `serverError`, `UNIQUE_VIOLATION` and `NO_STORE`. A guard returns the value or a `Response` the route returns as is, the pattern `requireDashboardKey` and `tooManyRequests` already used. Auth now comes before the body in every cookie and CLI route, so a bad body from an unknown caller gets 401, not 400. Other status codes and bodies are unchanged for the CLI. Zia approved.
- **Why:** each route repeated the same token, session and 500 handling.
- **Rejected:** a route wrapper HOF; a shared `parseJson` (each route keeps its own 400 message, so a shared parser added nothing).

## 2026-11-05 · Spend limits fail closed in production

- **Decision:** the rate limits that guard model spend (`grade`, `process`) fail closed in production when Upstash is not configured: the route answers 503. A Redis error or timeout still fails open. The auth limits (sign-in, sign-up, email, device login) stay fail-open. A new per-learner `tokenCreate` budget guards `POST /api/cli/tokens`. Zia approved.
- **Why:** a missing env var on a deploy silently removed all spend protection.

## 2026-11-05 · The upload contract lives in `packages/shared`

- **Decision:** the upload request schema, `MAX_UPLOAD_BYTES` and the device-login poll constants move to `packages/shared` (the schema in `src/upload.ts`; the constants in `src/limits.ts`, which has no zod, so the CLI bundle stays at about 36 KB instead of 556 KB), imported by both the CLI and the web app. Zia approved; it changes a shared contract, so it needs Kasam's agreement in the PR review.
- **Why:** two copies drift: the CLI had no 60 s cap on `slow_down`.

## 2026-11-05 · `/design-system` is gated in production

- **Decision:** `/design-system` calls `notFound()` when `VERCEL_ENV=production`. `/canvas` had the same gate until #61 made it public on purpose; the gallery stays internal because it is a contributor tool, not something to show. The ui kit keeps its gallery-only components. Zia approved.

## 2026-11-05 · Not done, on purpose

- **AI SDK `generateObject` in place of `callModel`'s fetch:** the retry and 429 handling is tuned to Groq's free 8,000 tokens a minute. Revisit when leaving the free tier.
- **Vercel Queues or Workflow in place of `after()`:** both are beta, and `after()` works. Revisit if the stale-card shortcut in `process.ts` is ever seen.
- Zia approved both.

## 2026-11-04 · Defend it: timed defenses on their own table

- **Decision:** a `defenses` table (`20261105000100_defenses.sql`) holds one timed defense of a card per row: status `answering`, `follow_up`, `finished` or `expired`, both answers, the follow-up question, the 0/1/2 score and server timestamps. Routes: `POST /api/defend/start`, `POST /api/defend/[defenseId]/answer` (stores the answer, returns the follow-up, no grade) and `POST /api/defend/[defenseId]/follow-up` (grades and finishes). The learner gets 180 s for the first answer and a fresh 120 s for the follow-up; an answer is refused after its deadline plus 5 s. A finished defense is labelled "defended (timed, follow-up)", never "verified".
- **Clock:** every timestamp is the API route's `new Date()`, never the browser's or a database default we rely on. The follow-up's 120 s starts when its question is stored, not when the first answer arrives, so a slow model call costs the learner nothing.
- **One unfinished defense per learner:** a partial unique index on `(user_id)` where status is `answering` or `follow_up`. A late defense is marked `expired` (by the late answer, or by the next `start`), so an abandoned tab can't lock a learner out; `start` returns 409 with the running defense's id otherwise.
- **Cards:** any visible card the learner has an answer of 2 on, not only owned ones (see the review-ladder entry below). Picked at random from the server; the card and its answer key never leave the server except `question`.
- **Prompts:** the follow-up and the grade both use `callModel("grade", …)`, so `MODEL_GRADE` serves them and there are no new env vars. `data.mode` (`follow_up` or `defend_grade`) tells the two jobs apart; the fake provider (development only) branches on it. Both spend from the existing 60 model calls an hour.
- **Writes:** server only. A learner can read their own rows (RLS); insert, update and delete are revoked, and there are no policies for them. A defense does not write `answers` or `reviews`, so it never moves the review schedule.
- **`database.types.ts`:** the `defenses` block is hand-written, copied from the generator's shape, because no local Supabase stack was available. Replace it with the real `supabase gen types typescript --local` output if CI's rls job shows drift.
- **Rejected:** a `defense` flag on `answers` (a defense is two answers and a question, and would break `answers.score`'s meaning on the review ladder); timing in the browser (the learner controls it); a model task of its own (a new env var for no gain); resuming a running defense (the screen can follow in a later change).

## 2026-11-04 · Sync hook pinned to 0.3.0

- **Decision:** the hook snippet in `packages/cli/README.md` and the setup prompt (`apps/web/src/lib/setup/ai-prompt.ts`) now pin `session-coach@0.3.0` (device login, repo and branch, 5-minute quiet period).
- **Why:** 0.3.0 is published and the real upload test passed. The pin only moves after the new version is published and tested.

## 2026-11-04 · Sync waits 5 minutes of quiet, not 10

- **Decision:** `SYNC_QUIET_MS` is 5 minutes. `sync` skips a log modified in the last 5 minutes and uploads it on a later start.
- **Why:** the ideas canvas and the demo flow say 5, and a session that ended a few minutes ago should upload when the next one starts.
- **Consequence:** a log is marked done after its first upload (`sync-state.json`), so a session resumed after 5 or more quiet minutes loses the part written after the upload. `sync` runs at session start, so the previous session is normally finished.
- **Rejected:** keeping 10 (the next start after a short break skips the log); re-uploading logs that grew (each upload starts a model run, and Groq's free tier takes one at a time).

## 2026-11-04 · Sessions carry repo and branch

- **Decision:** the CLI sends `repo` and `branch` in step ① of a push. `repo` is the basename of the first `cwd` in the log, the same format as `projects.repo` and the seed (`session-coach`). `branch` is the last non-empty `gitBranch` in the log. Both are null when the log has none, and are cut to the schema's 200 characters. `POST /api/sessions` already stored them (the schema accepts them and the insert spreads the parsed body), so the server is unchanged.
- **Why:** the app lists work project by project, and `projects` matches `sessions.repo` exactly.
- **Rejected:** the first branch (a session often starts on `main` and moves to a feature branch, and the last one is where the work landed); the last `cwd` (an agent that `cd`s into a subfolder would make a project per folder); `git remote` or the full path (a path leaks the learner's home folder, and the remote needs git at push time); reading the branch from git at push time (it is the branch now, not the one the session ran on); guessing a repo from the log's file name (it is a session id).
- **Consequences:** a session run from a git worktree gets the worktree's folder name as its repo, not the main checkout's. Two projects with the same folder name become one project.

## 2026-11-04 · Optional reasoning effort per model task

- **Decision:** `MODEL_EXTRACT_REASONING` and `MODEL_GRADE_REASONING` (low, medium or high) are read by `callModel` and sent as `reasoning_effort` when the provider is groq. Unset, empty or invalid, nothing is sent and the request is what it was; an invalid value is ignored, not an error. The parsing lives in `lib/model/reasoning.ts`, which is pure so `node --test` can run it.
- **Why:** with the new extraction prompt, gpt-oss-120b on Groq sometimes returns an empty answer or a 400 `json_validate_failed`, probably because thinking uses up the 2,048-token output budget. A lower effort leaves room for the JSON. Not verified against Groq yet: try `low` on extraction and watch for empty replies.
- **Rejected:** raising `MAX_OUTPUT_TOKENS` (Groq's 8,000 tokens per minute is shared with grading); hard-coding an effort (it would name a model's behaviour in code and apply to models that don't take it); sending it to openrouter or gemini (different shapes, not needed yet).

## 2026-11-04 · Review ladder: answers on days 0, 1, 4, 11

- **Decision:** a card is answered on day 0, then on days 1, 4 and 11. `GAP_DAYS` is `[1, 3, 7]`, and those are the gaps after each answer, not day numbers. For a perfect run starting Tue 3 Nov, the cards are due 4, 7 and 14 Nov, and the card is mastered on the 14th. A miss (score below 2; a 1 counts as a miss) drops one rung and the card is due tomorrow. We never write "day 7" in the demo or in any copy, because the third review is on day 11.
- **Why:** "day 7" read as the 7th day, but with the gaps added up the third review is on day 11. The `schedule.test.ts` perfect-run test shows the due dates.
- **Consequence:** "owned" means mastered, so the earliest owned card is about 14 Nov and a demo-day meter would read 0 of N. Agreed with Zia on 4 Nov: the meter shows "explained N · owned M of total", and Defend works on any card the learner has answered 2 at least once.

## 2026-11-04 · Question level per project

- **Decision:** learners pick how hard questions are per repo: simple (one-step "why did we do X"), hard (the trade-off or rejected alternative, and what breaks if changed) or complex (reason across two decisions, or predict a change in a new scenario, still grounded in the session). Stored in a new `projects` table keyed by `(user_id, repo)`; the extraction prompt swaps only its question line by level. Default simple.
- **Sessions with no repo** have no project and use simple. No `profiles.default_question_level`: nothing needed it yet.
- **Onboarding:** a dashboard card per repo with sessions but no `onboarded_at`. "Not now" saves simple and sets `onboarded_at`, so nothing hides a prompt forever without a choice. /settings changes it later; changes apply to new sessions only, existing cards keep their questions.
- **Writes:** learners insert their own row (RLS also requires a session in that repo) and may update only `question_level` and `onboarded_at` (column grants). The action updates, then inserts, because a PostgREST upsert writes `user_id` and `repo` on conflict.
- **Rejected:** a level per learner (one repo can be new and another familiar); a level per session (too many prompts); regenerating existing cards on change (pipeline work, v2); a `security definer` upsert RPC (column grants already do the job).

## 2026-11-04 · Device-code login for the CLI

- **Decision:** `session-coach login` uses the OAuth 2.0 Device Authorization Grant (RFC 8628): the CLI gets a device code and an 8-letter user code, opens `/cli/approve?code=…`, and polls until the learner approves; the server then mints a `cli_tokens` row labelled with the device name and hands the raw token to the CLI once. `/setup` lists tokens as connected devices and leads with a copyable "Set up with your AI" prompt per agent that runs this login, so no prompt ever holds a token. `login --token` keeps the paste path.
- **Why:** copying a token from the browser into a terminal (or an agent chat) is the error-prone step, and it leaves the token in the clipboard and chat logs. GitHub CLI, Vercel CLI and others use the same flow.
- **Security choices:** device code 32 random bytes, stored as sha256 only; user code from a 20-letter alphabet without vowels or look-alikes (20^8 ≈ 2.6 × 10^10), 10 minutes; the URL code never approves by itself (phishing: an attacker can send a link, but the page names the computer and IP and needs a click); approve and deny are same-origin only (Origin header, falling back to Sec-Fetch-Site); token issue is a compare-and-set on `token_issued_at is null`; per-IP limits on start and poll, per-learner on approve, deny and lookups; every response `Cache-Control: no-store`.
- **The Claude Code prompt adds the `sync` SessionStart hook** exactly as `packages/cli/README.md` documents it (project `.claude/settings.json`, pinned, async), not a hand-written SessionEnd hook: SessionEnd hooks are killed within a short budget, and `sync` already skips logs still being written. It has no minimum session length: a 2-minute session still uploads, on a later start once its log has been quiet for 10 minutes.
- **Rejected:** a localhost callback server in the CLI (breaks over SSH and in containers, needs a free port and a redirect allow-list); polling with the user code instead of a separate device secret (the user code is short and shown on screen); auto-approving when the learner opens the link (the classic device-code phishing hole).

## 2026-11-04 · Answer first: why and evidence revoked, skips keep the step, 5 cards a day

- **Decision:** learners lose the `select` grant on `decision_cards.why` and `evidence` (migration `20261104000000`; `model_answer` stays revoked). The server reads them with the service role only for a card of the learner's that has a `reviews` row (`revealAnswered` in `lib/cards/queries.ts`, owner, `hidden` and answer checked in code since the service role skips RLS), and `POST /api/review/answer` returns them with the grade. "I don't know yet" is stored with `answers.skipped = true` (same migration), scores 0, shows the why, and keeps the card's step (at least 1): it comes back tomorrow with no level lost, where a wrong answer drops a step. Each local day has at most 5 cards (`todayQueue`, `lib/review/today.ts`): 5 minus the answers already given today, skips included, up to 2 slots for new cards (newest session first), the rest due cards oldest due first. The queue, the dashboard count and the daily email use that one function, and the answer route refuses a 6th answer with 409 and writes nothing. The answer box blocks paste and drop in the browser.
- **Why:** the grant let anyone with a session read the reason through Supabase's REST API before answering, which made "answer first" a UI rule only. A skip that cost a level would push people to guess or paste into an AI; it costs nothing so they say so instead. Five a day keeps the habit small enough to keep: a learner back from a break or with many sessions isn't handed 30 cards, and new cards keep flowing instead of waiting behind old ones. The skip is its own column, not a match on the stored text, so a learner who types "I don't know yet" isn't treated as a skip. Blocking paste is a nudge, not a control.
- **Rejected:** an RPC that checks the `reviews` row (more SQL to keep in step with RLS than a service-role read beside the existing route); counting only graded answers toward the cap (a skip is still a card done today); a cap on the client only (a never-answered card opened from `/s/[id]` would pass it); a server check against pasted text (can't tell paste from typing).

## 2026-11-03 · Plain-language cards, the first prompt is always kept, timeline budget 13,500

- **Decision:** the extraction prompt now writes cards for a learner reading on a phone with no code open. The `decision` sentence is short plain English, says what was chosen and over what, and never holds the reason; the question is what a teammate would ask aloud (under 20 words); the prompt carries three examples. `trimTimeline` always keeps the first prompt (cut to 1,500 characters like any event), then fills the rest of the budget newest-first. Output shape, evidence rules, `MAX_CARDS` and the question levels are unchanged.
- **Why plain words, and no reason in the decision:** answer-first shows the decision sentence before the learner answers, so a reason inside it gives the answer away. Cards like "Add a test that asserts `SYNC_DEADLINE_MS` > ..." can't be read on a phone and ask nothing a teammate would ask.
- **Why the first prompt:** reasons live mostly in prompts, and the newest-first trim had cut the sync session's clearest reason, which was in its first prompt. The first prompt counts toward the budget. If it alone is over the budget it is cut to the budget and sent alone.
- **Cost:** the examples add about 400 tokens per call (estimate); the whole prompt adds about 700 to 800 tokens (estimate, 3.5 characters per token not verified).
- **Supersedes "Budget stays 16,000":** `MAX_TIMELINE_CHARS` goes from 16,000 to 13,500 so one call stays about the size it was (the timeline drops about 700 tokens, the instructions grow about 750). Estimate: check the next real sessions for 429s. `MAX_EVENT_CHARS` stays 1,500.
- **Working rules in the first prompt:** our own first prompts start with working rules for the agent (plan only, do not commit), so the prompt tells the model to ignore them. If tomorrow's eval still shows cards made from them, cap or skip a rules-only first prompt.
- **Risk:** the model may copy the sync example's topic into cards for unrelated sessions. Look for it in the next real sessions.

## 2026-11-03 · Answer first: the why stays off the page until the learner tries

- **Decision:** on `/s/[id]` a card with no `reviews` row shows only its decision, its question and the answer box. Its why, source, files and evidence are not read for the page at all (`getSessionWithCards` reads them only for answered cards). `POST /api/review/answer` returns the why, the evidence and the model answer (not the source or files: the session page shows those once the card has a `reviews` row). "I don't know yet" is an honest skip: `{ cardId, dontKnow: true }` scores 0 with no model call, shows the why, and schedules the card for tomorrow, so a second skip the same day gets a 409 from the due check and can't be used to read a card twice a day. Superseded in part on 2026-11-04: skips are marked by `answers.skipped` and keep the step, and the columns are revoked.
- **Why:** the why sat right above the question, so reading it felt like knowing it and nothing was remembered (retrieval before reveal). Hiding it with CSS or in client state wouldn't do: it would still be in the HTML and the RSC payload. The skip is there so people don't guess or paste the question into an AI.
- **Rejected:** counting a skip against the hourly grade limit (it costs no model call).

## 2026-11-03 · A ready session with no cards says "No decisions found"

- **Problem:** a session that finished with zero cards is still `ready`, so the dashboard row said "Ready" and the sidebar said "Cards ready". Nothing was ready to review.
- **Decision:** the label comes from the status and the visible card count (`sessionLabel` in `lib/sessions/status-label.ts`). Ready with 0 cards says "No decisions found"; every other label is unchanged. The dashboard row also hides "0 cards". This is display only: `process.ts` still writes `ready`, and there is no migration and no change to `packages/shared`.
- **Caveat:** a ready session whose cards are all hidden or flagged also reads 0 visible cards, so it shows "No decisions found" too.
- **Rejected:** a new status or a saved "no decisions" flag (a schema change, and the pipeline's output is a shared contract).
- **Known gaps:** the live toast still says "Cards ready" for zero cards, because the count arrives after the toast. `/s/[id]` still shows its own "Ready" badge until `zia/answer-first` merges, because that branch changes the page. A just-settled live row may show "Cards ready" for a moment before the count arrives.

## 2026-11-03 · Session titles are cleaned when shown, and only `pasted_content` is unwrapped

- **Problem:** a title is saved from the first prompt, and it kept tags like `<pasted_content id="…">` or `<system-reminder>`. The dashboard and the sidebar showed the raw tags.
- **Decision:** `cleanPromptTitle` (`lib/sessions/name.ts`, pure, no Node imports) removes leading tags and collapses whitespace. `sessionTitle` (`lib/pipeline/process-rows.ts`) cleans first, then cuts to 80 characters, and takes the first prompt that still has text. `sessionName` cleans too, and every list, the sidebar, the toast, the review pages and `/progress` read it.
- **Old rows:** the title is saved once (`process.ts` keeps an existing title), so old rows keep their tags. Cleaning in `sessionName` fixes them when they are shown. There is no backfill and no migration. Cleaning twice gives the same result, so cleaning at both ends is safe.
- **Which tags:** the injected wrapper tags (`system-reminder`, `local-command-*`, `command-*`) are removed with their contents. `pasted_content` is unwrapped: its text is the prompt, so only the tag goes, closed or not. Old titles were cut at 80 characters, so they have no closing tag. Any other tag is left alone, because it may be what the learner typed (HTML in a question, for example). The evidence for `pasted_content` is a screenshot of the dashboard, not code in the repo. The parser and its fixtures only know `command-name` and `local-command-*`.
- **Rejected:** a migration or backfill, unwrapping every unknown tag, and a model-written title.
- **Known gaps:** `app/(app)/s/[id]/page.tsx` has its own copy of the fallback chain and still shows raw old titles. Switch it to `sessionName` after `zia/answer-first` merges, because that branch changes the file. Not done: a model-written title. It would cost another model call or a change to `packages/shared`.

## 2026-11-03 · `sync` uploads finished sessions from a SessionStart hook

- **Decision:** `session-coach sync` (CLI 0.2.0) is run by a hook a learner adds to a project's `.claude/settings.json` (matcher `startup|resume|clear`, `async: true`, version pinned). On each start it uploads that project's top-level logs modified between 7 days and 10 minutes ago, newest first, at most 1 per run (the rest follow on later starts), skipping the running session and every id in `~/.session-coach/sync-state.json`, through the same redaction and upload path as `push`. It prints nothing (a SessionStart hook's stdout goes into Claude's context), exits 0 on every failure, and writes a summary and errors to `~/.session-coach/sync.log`. A 409 with no upload URL ("ready or processing") is a quiet skip; a 409 with one means upload again. Not signed in, offline, a 401, 429 or 5xx end the run and record nothing; a session the server marks failed (or rejects with 400/413) is recorded once and never retried by `sync`. The run gives up after 180 s (`SYNC_DEADLINE_MS`, more than the 120 s upload timeout plus two 15 s API calls, so a slow but working upload isn't cut off), because the hooks docs say `timeout` is not enforced on an async hook.
- **Why opt-in, per project:** `sync` uploads without the learner looking, and redaction is best-effort. A hook in the project's own settings file is a choice made project by project; nothing installs it.
- **Why 7 days:** matches `NEW_CARD_DAYS`: a card never answered within 7 days of its session leaves the review queue, so an older log would cost a model run for cards nobody sees.
- **Why 1 per run:** each upload starts a model run, and the model free tier allows 8,000 tokens a minute. Several sessions processed together hit that limit and fail (see the Groq gap below). One session per start keeps runs apart; a backlog clears over the next starts. It also keeps well under the server's 20 pushes an hour, 409 repeats included. We first planned 3 per run and lowered it for this reason.
- **The CLI cannot see a later server-side failure.** `sync` records a session as `pushed` as soon as the server accepts it (a 202 from the process step, or a 409 that says it exists). If the model run then fails, `sync` never learns of it and never retries it, so a failed session needs `push <file>` by hand.
- **Why a 10-minute quiet period:** the server keeps the first upload of a session (409 ready), so a log uploaded while still being written would never be completed. Residual: a session resumed after more than 10 minutes keeps writing to a log that may already be uploaded.
- **Why not Stop-after-every-turn:** a session is finished once, but Stop fires every turn. It would redact and gzip a growing log each time, spend the hourly push limit, and upload half sessions that the server then refuses to update.
- **Rejected:** a lock file for two syncs at once (the server dedupes by `(user_id, external_id)`; the loser costs a wasted upload), retrying failed sessions automatically (a re-POST of a failed session deletes its cards and reruns the model), pruning the state file, truncating `sync.log`, syncing every project, installing the hook for the learner.
- **Known gaps:** Windows is untested (paths, `npx` shim, hook shell). Sessions processed at the same moment (more than one learner, or a manual `push` during a sync) share Groq's 8,000 tokens per minute with no queue between them, which is why `sync` sends one at a time. A model failure never reaches `sync`: the process endpoint has already answered 202, and `processSession` then runs on its own and marks the session `failed` when anything throws, so `sync` has recorded it as `pushed` and the learner must run `push <file>`. There are two retries (read from `extract.ts`, `call-model.ts` and `retry.ts`): (1) `extractCards` makes a second call when the first answer fails validation, after `RETRY_DELAY_MS` (60 s, a fresh minute); a second invalid answer throws `ExtractError`. (2) `callModel` retries a call once after a provider error (timeout, 5xx, non-JSON, 408 or 429; any other 4xx is not retried), after 2 s, or after the 429's `retry-after` capped at 20 s (`MAX_RETRY_WAIT_MS`); a second failure throws `ModelCallError`. For the 8,000 tokens/minute budget this means only (1) clears a minute. The call-level retry waits at most 20 s, inside the same minute, so after a 429 it can hit the limit again and fail the session. Each of the two extraction calls also has its own call-level retry. Two syncs at once can still overwrite each other's state entry in the short gap between `saveState` re-reading the file and writing it.

## 2026-11-03 · A miss drops a card one level

- **Decision:** a score below 2 moves the card one step down (never below step 1) and it is due tomorrow; a 2 is unchanged. Only the last review (step 3, day 7) behaves differently from the old "starts again at day 1": a miss there goes back to step 2. The level is the rung: 0 never answered, 1-3 the pending step, "owned" = mastered (`levelOf` and `countOwned` in `lib/review/level.ts`, pure). The 1/3/7 days are the gaps after each answer, so a perfect run is mastered about 11 days after the first answer (answers on day 0, 1, 4 and 11). Clarification: copy that said "day 1, 3 and 7" meant these gaps; reviews land on day 1, 4 and 11, and passing the day-11 review masters the card.
- **Why:** one slip shouldn't erase the progress on a card (burnout risk).
- **Callers:** `countOwned` takes visible cards only; the caller leaves hidden cards out, or their reviews would count toward both numbers. The `reviews` policy checks only `user_id`, so a plain select returns reviews of hidden cards. Select reviews through an inner embed of `decision_cards` with the RLS client, or filter `hidden = false` with the service role.
- **Rejected:** keeping the restart at day 1 for every miss.

## 2026-11-02 · Empty states say why they are empty

- **Decision:** each empty state names its reason and the next step. The review queue tells a first run (`NoCardsYetEmpty`: no cards at all, set up the CLI) from all caught up (`AllCaughtUpEmpty`: cards exist, none due, with when the next one is due). `/progress` with no cards shows the same state. A learner with no card isn't always a first run, so `cardlessReason` (`lib/sessions/queries.ts`) picks the copy from the learner's latest session only (an older row left pending says nothing about now): none yet (set up the CLI), still being read (cards on the way), failed (open that session, which shows the pipeline's error), or ready with no card (each card needs a verified quote); cards with no answer yet still show `NoReviewsEmpty`. The dashboard, review and progress error boundaries share `LoadErrorState`, which shows `OfflineState` when the browser is offline and retries by itself when it reconnects. `emptyQueue` (`lib/review/queries.ts`) is the second read that tells them apart; it runs only when the queue comes back empty. A card never answered within 7 days of its session leaves the queue by design (`NEW_CARD_DAYS`, so a learner back from a break isn't handed the backlog), so a learner whose only cards are like that sees "All caught up" with "no review is scheduled", which says that card is still on its session's page and links to the sessions. `nextDue` counts only reviews of visible cards (an inner embed of `decision_cards`), so a hidden card never sets it.
- **Why:** the queue said "No cards due today" both to a learner who had never sent a session and to one who had finished today's reviews, and progress sent a first-run learner to that empty queue. Each reason has a different way out.
- **Rejected:** a no-access state for `/tracker`: a learner who isn't a member gets a 404 on purpose, so the page doesn't reveal itself. No-results and filtered-to-nothing: the app has no search or filters yet; `NoResultsEmpty` already exists for when it does.

## 2026-11-02 · The landing's demos loop in place, on motion.dev

- **Decision:** the landing gets a product bento under the hero (`components/marketing/bento-*.tsx`, layout and timing cloned from a reference video, spec in `.reanimate/bento/spec.md`, which is git-ignored) and one looping demo per section: the review schedule, the quote check, the secret filter. Idle micro motion (bell, bars, dot, caret) and the demos' springs and enter/exit swaps use `motion` (pinned 14.3.0, client components only). Simple transitions stay Tailwind. Every demo idles in place; none waits for a scroll. `MotionConfig reducedMotion="user"` drops transforms and `useLoopStep` stops the loops under reduced motion.
- **Why:** Zia asked for micro animations with motion.dev. Springs, keyframe loops and exit animations are a few lines with it and a lot of hand CSS without. The design system bans scroll reveals, so the motion runs on its own clock.
- **Rejected:** scroll-triggered entrances (banned); the reference's sliding tab pill (the segmented control cuts by design); a 3D glass asterisk (the watercolour cards sprite turns instead).

## 2026-11-02 · Measured skeletons with skullet on the app's data pages

- **Decision:** the dashboard's session list, the review queue, a session's cards (`/s/[id]`), the quiz (`/review/[cardId]`) and `/progress` load behind a skullet skeleton (`skullet@0.0.3`). The skeleton is the real component rendered from sample rows, measured into bars, so each row's skeleton is the shape of a real row. The row count is a representative sample (4 sessions, 3 queue cards, 2 decision cards, 3 sessions on /progress), not the real count. No boundary knows the count, the dashboard's due banner or its page links before the query returns, so the list can still grow or shrink when the data lands, as it did with the old fixed 4-row skeleton. A learner with nothing yet (no sessions, no cards due, no answers) sees the populated skeleton give way to the empty state; `main` did the same with its fixed skeletons, and whether a learner is empty is only known after the query. `SkulletProvider` in the root layout points skullet at the design system's skeleton tokens: `--surface-skeleton` fill, `--radius-soft`, pulse. Static headings carry `skullet-own` so they stay real text, as the hand-built skeletons had them.
- **Why:** the hand-built `SessionListLoading` drew fixed `h-4` boxes. They didn't match a row's real height or text widths, and the review page reused the session-list skeleton for a list with a different shape. With skullet the skeleton follows the component, so it can't drift when a row changes. Holding the count too would mean reading it ahead of the rows.
- **Workarounds for 0.0.3 bugs:** skullet sets `-webkit-text-fill-color: transparent` on the loading root. That property inherits, so it also hides text inside `skullet-own`; `globals.css` sets it back to `currentColor` there. Skullet also counts Tailwind's `shadow-none` (five transparent zero shadows) as a surface. A card header holding one line of text then draws as a single block. `card.tsx` sets a list card's header to a plain `box-shadow: none` instead, which renders the same (pixel-identical page) and draws the decision card's title as a bar. `skullet-own` text that inherits its colour also needs its own colour class, because skullet sets `color: transparent !important` on everything it draws; `/progress` gives its header spans `text-text-1` and `text-text-2`.
- **No shape memory:** the pages use `MeasuredSuspense` (`components/app/measured-suspense.tsx`), a plain `Suspense` whose fallback is skullet's `<Skeleton loading>` over the sample view, not skullet's own `SkeletonSuspense`. `SkeletonSuspense` always keeps a copy of the loaded content in `localStorage["skullet:shapes"]` (`id` or not; no opt-out up to 0.0.3) and saves it again 250 ms after every change. Its mask replaces only ASCII letters and digits, so non-ASCII text stays readable, and attributes stay, so `href`s with the learner's card and session ids are kept. On the quiz that copy would include the model answer after grading. RLS doesn't guard localStorage: same-origin scripts and extensions can read it, and skullet replays it as the next account's skeleton. A `loading` Skeleton only measures what it is given; skullet's memory is created only around revealed content, so the real data never reaches it (checked: `localStorage` stays empty across all five pages). The cost is skullet's reveal animation: the content replaces the skeleton without a crossfade. `ForgetShapes` (`components/auth/forget-shapes.tsx`) still clears skullet's store on every signed-out screen (the signed-out marketing nav, where every sign-out lands, and the auth layout), for shapes an earlier build of this branch saved.
- **Rejected:** fixing the hand-built skeletons by hand. Each would need re-measuring whenever its component changes. Skullet's `SkeletonSuspense` with `ForgetShapes` as the only guard: clearing at sign-out doesn't stop a script reading the copy while the learner is signed in.
- **Settings, setup and tracker (later the same day):** they moved to `MeasuredSuspense` too, replacing `SettingsLoading`, `TokenSectionLoading` and `TrackerLoading`. Settings measures the whole account view from a sample profile; setup measures only the token card from two sample tokens, since the rest of the page is static and never suspends; the tracker measures `TaskList` from five sample tasks in two sections, so a team with more sections still grows when the data lands. Card titles and the settings and token descriptions carry `skullet-own`. The settings view is wrapped in a `gap-6` column: skullet wraps the skeleton in an element, so a fragment's cards would lose the page's gap.
- **Revisit when:** skullet passes 0.1 (drop both workarounds if they're fixed upstream), or when more pages move off `loading-state.tsx`. `DecisionCardLoading`, `ReviewCardLoading` and `StatRowLoading` remain only as design-system specimens. Done 2026-11-05: `loading-state.tsx` is gone; the four hand-built loaders live on only in the `/canvas` previews (`components/canvas/previews/loading.tsx`), and `ProcessingState` moved to `components/app/processing-state.tsx`.

## 2026-11-02 · The CLI ships as one bundled file, as the unscoped npm package `session-coach`

- **Decision:** `packages/cli` is named `session-coach` (version 0.1.0, MIT) and publishes only `dist/cli.js`, `README.md`, `LICENSE` and `package.json`. `esbuild` (pinned 0.28.2) bundles our code and `@session-coach/shared/redact` into that one ESM file for Node 20+; only `node:` builtins stay external, so `@session-coach/shared` is a devDependency and no workspace import is left at runtime. `prepack` runs the build. The root private package is renamed `session-coach-monorepo`.
- **Why:** `npx session-coach` is the install the setup page promises; the shared package is not on npm, so it has to be inside the file. Two workspace packages named `session-coach` made `pnpm --filter session-coach` match both, so the root changed (agreed with Zia).
- **Rejected:** publishing `@session-coach/shared` too (a second public package and contract to keep in step); a scoped name (the setup page already shows `npx session-coach`). **Not published yet:** the PR publishes right after merge; until then `npx session-coach` will not resolve. **Done:** `session-coach` is on npm (0.2.0 on 3 Nov 2026).

## 2026-11-02 · The CLI redacts before upload

- **Decision:** `redact.ts` moved to `packages/shared` (`@session-coach/shared/redact`). `push` redacts before gzip: each line is parsed, its string values (not keys) are redacted, and it is serialized again, so a JSON line stays JSON. A line that doesn't parse is kept in place and redacted as plain text.
- **Why:** the setup page says secrets are redacted on the laptop. Running the rules over raw JSON text could break escapes; per-line parsing can't.
- **Structural fields** are exempt only at known structural locations, to preserve the log's structure (a uuid matched the long-token rule). The parser itself needs only the `tool_use` block's `id` and the `tool_result`'s `tool_use_id`, to link calls to results; it does not need the others. The fields: the event's top level (`uuid`, `parentUuid`, `sessionId`, `requestId`, `timestamp`, `type`); `event.message` (`id`, `role`, `type`); and the items of `event.message.content` when it is an array (`type`, plus `id` on a `tool_use` block and `tool_use_id` on a `tool_result` block). Every other string value is passed through the redactor at every depth, including a `tool_use` block's whole `input`, a `tool_result`'s `content` and any `toolUseResult`.
- **Rejected:** regexes over the raw text (can corrupt a line); exempting these key names at any depth (a secret under an `id` or `type` key inside a tool input would go through unredacted). **Trade-off:** the log is decoded as UTF-8, so an invalid byte now arrives as U+FFFD.
- **Numbers** go through `JSON.parse`, so integers above 2^53 lose precision; the server parser has the same limit, so nothing downstream changes.

## 2026-11-01 · Big sessions: stay on the Groq free tier, send only the last ~9k characters

- **Superseded:** the budget is 13,500 characters (16,000 before "Plain-language cards"), not 9,000, after a 1,500-character cap per event ("Timeline trim budget" below; `MAX_TIMELINE_CHARS` and `MAX_EVENT_CHARS` in `apps/web/src/lib/pipeline/process-rows.ts`). Long Bash commands are still kept whole by the parser; the per-event cap bounds them.

- **Decision:** extraction stays on the Groq free tier (`MODEL_PROVIDER=groq`, `openai/gpt-oss-120b`), no paid plan. Every call has to fit the free tier's 8,000 tokens/minute, so the timeline sent to the model is cut to its **last 9,000 characters** (about 3,000 input tokens at the measured ~3 characters per token). The one retry adds the failed answer (about 1,000 tokens), so it sends about 4,000; either call leaves about 4,000 tokens of the minute for the answer and reasoning. Older events are dropped whole, newest kept, because the end of a session usually holds the decisions that shipped. If the newest event alone is over 9,000 characters (a long Bash command, which the parser keeps whole), it is cut to its first 9,000 characters and sent alone, so a call never goes over budget. The existing 60-second wait before the retry keeps it in a fresh minute. Follow-up code (not done yet): the 9,000-character cut before `extractCards`, replacing the planned 150,000; and cutting long Bash commands in the parser, so more events fit in the budget.
- **Why:** measured offline on 3 of Zia's own Claude Code sessions on this repo. Each log ran through the extraction branch's `parseSession` (with `redact`; Read results dropped, tool results cut to `RESULT_MAX_CHARS` = 500). The request was built as `extractCards` builds it (`EXTRACT_INSTRUCTIONS` + `{ events }` JSON) and tokens were counted with `js-tiktoken` `o200k_base` (the base of gpt-oss's o200k_harmony), plus about 60 tokens for message wrappers. Nothing was sent to any provider. A request over the free tier's 8,000 tokens/minute can't fit in any minute, so the medium session fails on the first call, not only on the retry.

  | Session                  | Raw log | Events kept | Characters sent | Prompt tokens | Retry call tokens | Fits free tier (8K TPM) |
  | ------------------------ | ------- | ----------- | --------------- | ------------- | ----------------- | ----------------------- |
  | Small                    | 0.87 MB | 9           | 8,380           | 2,284         | 3,263             | Yes                     |
  | Medium                   | 15.4 MB | 229         | 108,366         | 35,476        | 36,455            | No (4.4x)               |
  | Large                    | 56.1 MB | 2,187       | 1,144,300       | 333,499       | 334,478           | No; over 131K context   |
  | Large, cut to 150k chars | 56.1 MB | 423         | 151,950         | 44,047        | 45,026            | No (5.5x)               |
  - **Output:** a 5-card answer is about 930 tokens of JSON. gpt-oss also spends reasoning tokens (default effort `medium`), not measured here; budget 2,000 to 4,000 output tokens per call.
  - **Worst case per session on the free tier:** about 3,000 input tokens plus up to 4,000 output on the first call, and about 4,000 plus 4,000 on a retry: about 7,000 to 15,000 tokens, one call per minute. The 200,000 tokens/day cap then allows roughly 13 to 28 extractions a day, shared with grading (one grading call is about 1,000 to 2,000 tokens). Enough for the trial; not for V2.
  - **The cost of the cut:** for the medium session, 9,000 characters is about the last 8% of what would otherwise be sent; for the large one, under 1%. Cards come only from the end of a long session.
  - **Where the characters go:** shell commands are the biggest kind (57k of 95k text characters in the medium session, 469k of 1.03M in the large one), because the parser keeps a Bash command whole (heredocs, PR bodies). Cutting commands to 200 characters still leaves the medium session at 19,415 tokens, so trimming alone can't reach 8K.
  - **Limits read 1 Nov 2026** at https://console.groq.com/docs/rate-limits for `openai/gpt-oss-120b`: free plan 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, 200,000 tokens/day; developer plan 1,000 requests/minute, 500,000 requests/day, 250,000 tokens/minute, no tokens/day limit listed. Uncut, free tokens/day would allow at most 5 medium sessions a day (200,000 / 35,476 first-call tokens); a schema retry adds about 36,455 more, and grading draws on the same quota, so the real number is lower.
  - **Price read 1 Nov 2026** at https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints: the Groq endpoint is $0.15 in / $0.60 out per million tokens; OpenRouter's cheapest endpoint is $0.017 / $0.063; the context is 131,072 tokens on most endpoints. One capped large session with a retry costs about $0.02 on Groq pricing.

- **Rejected:** the Groq developer (paid) tier: it fits even a 150,000-character cut of the large session in one minute (about 95,000 tokens with a retry, about $0.02), but Zia prefers no paid plan for the trial. Failing sessions over a cap instead of cutting them: only the small session fits, so most real sessions would fail in the demo. (c) Splitting the timeline at user prompts and extracting per chunk: under 8K per call, the medium session needs about 10 calls and the large one about 77 (23 of 79 prompt segments are larger than one call on their own). At 8K tokens/minute that is 10 to 77 minutes per session, plus merge-and-rank code. OpenRouter as the main choice: it works as config, but it adds a second key and provider routing we haven't tested, and grading would stay on Groq's free quota unless it moves too.
- **Not verified:** reasoning token counts (needs a real call); whether Groq bills the free 8K limit on input only or on input plus `max_tokens` (the docs describe one combined TPM cap); the Groq price on groq.com itself (read from OpenRouter's Groq endpoint instead); whether 9,000 characters still yields 3 to 5 grounded cards on a long session (check in the accuracy run on 5 real sessions).
- **Revisit when:** the accuracy check shows long sessions losing their important decisions, or V2 adds teams and more users. Then switch to the developer tier (config and billing only), raise the cut, move grading and extraction to separate keys or models so one can't starve the other, add the split-at-prompts path for sessions over the cap instead of dropping their start, and cut long Bash commands in the parser the way tool results are cut.

## 2026-11-01 · Timeline trim budget, and cards before `ready`

- **Decision:** before extraction each event's text is cut to 1,500 characters (the start is kept), then the newest events are kept until 16,000 characters are used (first version kept the oldest; see "Aligned with #32" below); the rest are counted as `cut_events` and logged. `processSession` inserts all cards in one call and sets `ready` only after that insert succeeds.
- **Why:** Groq's free tier allows 8,000 tokens per minute, and the instructions and the retry share that window. The per-event cap stops one huge event eating the budget; ids stay intact. Insert-then-ready means a crash in between leaves `failed`, never a `ready` session with no cards.
- **Aligned with #32 (3 Nov 2026): keep the end.** `trimTimeline` now keeps the newest events that fit and drops older ones whole (each costs its JSON as sent, so escapes count), returned in time order. Event ids stay the original `E<n>`, so a timeline can start at E57; `checkQuotes` looks events up by id, not by position, and an `event_index` that isn't in the timeline is `verified: false`. If the newest event alone is over budget its start is cut by code points and it is sent alone (the optional `budget` parameter makes that testable; with the 1,500 per-event cap it can't happen at 16,000). The first-16,000 behaviour described above is replaced; the 1,500 cap is unchanged.
- **Budget stays 16,000, not #32's 9,000, for now (superseded 3 Nov 2026 by 13,500, see "Plain-language cards"):** one real session fit yesterday, but 16,000 characters at about 3 characters per token is about 5,300 prompt tokens, which leaves about 2,700 of the 8,000 tokens/minute for the instructions and the answer. So the risk is on a single call too, not only on a retry. We have not measured the size of the instructions plus the answer at this budget; a retry or a second upload in the same minute likely goes over. Drop to 9,000 if Wednesday's 5-session check shows a rate-limit (429) failure.
- **Re-run:** pushing a `failed` session again (or one `processing` for over 10 minutes) deletes its cards, cascading to answers and reviews, and resets it to `pending` (POST /api/sessions).
- **Known gaps:** insert and `ready` are separate writes (a transaction needs an RPC migration). A platform kill leaves a session in `processing` until the daily cron fails it (stuck for over 10 minutes by `processing_started_at`, `lib/sessions/stuck.ts`), or the learner pushes it again.

## 2026-10-31 · Groq as temporary extraction backup, and prompt v2

- **Decision:** extraction runs on Groq `openai/gpt-oss-120b`, set through env only (`MODEL_PROVIDER`, `MODEL_EXTRACT`), with no code change. This is temporary. Gemini 3.8 Flash stays the target (#22) until a model comparison on the golden set. Zia agreed.
- **Why:** the `gemini-3.8-flash` free tier returned 503 or hung all day. A plain curl with a tiny prompt failed the same way while the model list returned 200, so the fault is not our code. Many forum reports have said the same since early October.
- **Limit:** the Groq free tier lists 8,000 tokens per minute, so large sessions may not fit.
- **First real run (one session, Groq):** 5 cards, 4 of 5 quotes verified, 3 `stated` cards downgraded to `inferred`. Hand check: 1 of 5 was a real decision; the rest were file writes, a deletion and a test result. One session only. Prompt v2 is the response: a decision needs two real options, one quote must state the choice or reason in words (a file write or shell command does not count), a card with no such quote is `inferred`, and zero cards is a valid answer (later replaced: Zia chose 3 to 5, see the extraction entry).
- **Rejected:** waiting for Gemini to recover (blocks Monday's demo); paying for Gemini billing (a forum poster doubted it fixes the 503s, and it costs money); `gemini-2.5-flash` (the API said it is closed to new users, 404).
- **Known gap:** `stated` is kept when a verified quote comes from a prompt or reply, even if the quote has no reason in it.

## 2026-10-31 · Extraction: card count, the stated rule, retry, file and lines

- **Superseded:** the model may return 0 to 5 decisions (`MAX_CARDS` and the prompt in `apps/web/src/lib/pipeline/extract.ts`), not 3 to 5, and a session with 0 surviving cards is still marked `ready` (`processSession` in `apps/web/src/lib/pipeline/process.ts`) and shows "No decisions found" (2026-11-03 entry).

- **Decision:** Zia chose 3 to 5 decisions from the model (top key `decisions`, evidence `{ event: "E2", quote }`; code turns `E2` into `event_index` 2). Code, not the prompt, drops every card with no grounded quote: a verified quote from a prompt, a reply, or a write or edit of a file named `DECISIONS.md`. A quote counts as verified only if it has at least 5 words after whitespace is collapsed (`MIN_QUOTE_WORDS`, matching the prompt's "5 to 30 words"); a shorter quote is `verified: false` even when it appears in the event, so it can't ground a card. This is checked in `evidence.ts`, not the schema, so one short quote doesn't fail the whole model answer. A session can end with 0 cards. A session with 0 to 2 surviving cards should still be `ready` (agreed with Zia; planned, to be done in `processSession` in the next PR, not done yet). `position` is set after the drops (0, 1, 2...). `files` keeps only paths that some write or edit event wrote, matched by suffix (equal, or ends with `/` + the path), because the model writes relative paths. An answer that fails the zod schema (including fewer than 3 or more than 5 decisions) gets one more call with the validation error in `data`; a second failure throws. `evidence.file` is filled by code from write and edit events (the path before `—`), never by the model; `lines` is `null` in v1.
- **Why:** the guide asks for 3 to 5, and the prompt can't enforce that a quote is real, so code drops what it can't ground. `source` is the model's label: every kept card is grounded, so `stated` means the model says the reason was written and a grounded quote verified. Code does not yet check that the quote contains the reason (known gap below). Grounding uses only quotes that exist in the timeline. One retry with the error fixes most formatting slips without looping on a model that can't comply. The model can't see line numbers in the timeline, so a file path it wrote would be a guess, and lines would be too.
- **Rejected:** letting the model return fewer than 3 or 0 decisions; keeping ungrounded cards as `inferred`; more than one retry; letting the model fill `file` or `lines`.
- **Known gap:** `stated` is the model's label. Code checks that a grounded quote exists, not that the quote contains the reason.
- **Known gap:** a padded card that quotes a reply still passes, because a reply is a grounded source even when it holds no reason.
- **Known gap:** a `stated` reason quoted from a `DECISIONS.md` write rarely verifies yet. The parser keeps only the path and line count of a write, and a 60-character preview of an edit, so the reason text is usually not in the event. The basename rule stays; it starts to matter when the parser keeps more of those events.
- **Supersedes part of 2026-10-28 (`flagged` and `hidden`):** ungrounded cards are now dropped before storing instead of kept as hidden rows, so `hidden` is never true for cards from this check (every kept card has a verified quote); `flagged` can still be true. The accuracy check reads the runner's `DROPPED:` lines (each with its quotes, ✓/✗ and event kind) instead of hidden rows.
- **Observed 1 Nov (one session, two runs on Groq):** the same session gives different cards on each run, because the model picks different quotes each time. A real decision was dropped when the model shortened its quote with "..." (exact match fails, so no grounded quote). A non-decision ("not committing since you didn't ask") was kept because it quoted a reply.
- **Trade-off accepted for Monday:** the rule may drop a real decision when the model misquotes it, and may keep a reply-quoted non-decision. Kept cards were real decisions in both runs except that one.
- **Candidate fix (Wed, after the accuracy check measures how often this happens):** one repair call when a quote fails, asking the model to copy the exact words from that event. Send only the cited events' text, not the whole timeline, to stay under Groq's 8K tokens/minute.

## 2026-10-29 · The browser key stays the anon key

- **Decision:** the browser and server clients read `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not the starter's newer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Why:** the project already runs on the anon key in every environment, and `docs/plans/auth.md` lets us keep it; both keys get the same RLS. Renaming means changing every environment at once for no behaviour change.
- **Rejected:** switching to the publishable key now. Revisit when Supabase retires the anon key.

## 2026-10-29 · Auth redirect origins come from the request

- **Decision:** Server Actions build `emailRedirectTo` and the OAuth `redirectTo` from the request's `Origin` header; route handlers use `request.nextUrl.origin`. Never `NEXT_PUBLIC_SITE_URL`, never `x-forwarded-host`.
- **Why:** Next only runs a Server Action when `Origin` matches the host (its CSRF check), so the header is trusted there. Using the request's own origin keeps preview sign-ups and the PKCE cookie on the preview that started them (docs/plans/auth.md, edge cases 10, 12, 13).
- **Rejected:** `NEXT_PUBLIC_SITE_URL` (sends preview users to production and loses the PKCE cookie); `x-forwarded-host` (spoofable).

## 2026-10-29 · Design system: one look, the zip's motion

- **Decision:** the components in `apps/web/src/components/ui/` are the app's design system and its default look: one shape language (radii, frames, type roles, states) on shadcn base-nova, with the micro-interactions of the zip we started from kept as they were (switch squash, tab indicator slide, toast stacking, swipe and pulse, drawer swipe, checkbox blur check, dialog scale-in). Segmented control, status, stat, page header, data list, timeline, code block and copy button sit beside them.
- **Why:** one component per name and one API for the gallery and the app.
- **Styles apply to the whole page.** `src/styles/tokens.css`, `base.css` and `utilities.css` are imported into `globals.css` as one Tailwind compile; tokens sit on `:root`, with no wrapper class. Overlays portal through `PortalProvider` (`src/lib/ui/portal.ts`), which also makes the page inert behind a modal.
- **Why one compile:** a second compile would override every `globals.css` utility silently, and `@shadcn/lint` reads only the `globals.css` import graph.
- **Semantic names:** the shadcn colour names (`background`, `primary`, `muted`, `border`, `sidebar-*`...) map straight to the design system's roles in `@theme`; the old shadcn colour variables are gone.
- **Motion tokens** stay the zip's: `--ease-out-quint`, `--ease-in-out-quint`, `--animate-toast-pulse-even/odd` and the reduced-motion reset on `[data-slot]`. Raw `cubic-bezier(0.22, 1, 0.36, 1)` copies in drawer and toast became `ease-out-quint`. `--dur-*` and `--ease-step` stay available beside them.
- **Menu rows:** a keyboard-highlighted row (highlighted, not under the pointer) draws a 2px inset ink ring; a mouse-highlighted row shows only the wash, and no row gets the outer focus ring. The wash alone is about 1.1:1 (WCAG 1.4.11).
- **Menus animate:** dropdown, select and combobox popups fade, zoom and slide in 100ms, although the zip's carried `animate-none!`. Zia chose the animation. A select popup aligned over its trigger (`alignItemWithTrigger`, the default) appears in place instead, since sliding from a side it did not open on reads wrong.
- **Toasts:** the zip's Base UI toast, not `sonner` as `docs/plans/pages-and-dashboard.md` lists, to keep its stacking, swipe and pulse.
- **Style:** `base-nova` (what `components.json` and the installed components use), not `radix-nova` as the plan says.
- **Colours for scores and flags:** `success` is the mint kind (hue 5), `warning` is amber. Warm hues are kept for trouble, so success is not green-on-warm.
- **Icons:** Phosphor (`@phosphor-icons/react`), `iconLibrary: "phosphor"`. Files without `"use client"` import from `@phosphor-icons/react/ssr`, because the main entry calls `createContext` and breaks server components. `lucide-react` is removed.
- **Fonts:** Geist for UI, Geist Mono for code, Instrument Serif for marketing headlines only (`font-display`), all through `next/font`.
- **Lint gate:** `pnpm lint` (oxlint + `@shadcn/lint`) and `pnpm format` (oxfmt) only. `src/lib/ui/**` turns off `react/refs`, whose two hits pass ref objects and callback refs without reading `.current` in render, and `react/no-children-prop`, because `createElement` in a `.ts` file has to pass `children` as a prop for its types.
- **URL state:** `nuqs` is approved for URL state, but not installed: the gallery uses plain `#anchor` sections, so nothing needs it yet. Add it with the first real consumer.
- **Theme:** the zip's three-way theme provider and toggle (`src/components/theme/`), moved to `useSyncExternalStore` for server rendering, with a `<head>` script that sets the class before paint.
- **Next:** refactor `components/ui` down to bare-minimum primitives (fewer variants, props and parts; composition over options) before the data phases build on it.

## 2026-10-29 · Sign-in: email + password and Google; provider-neutral profiles

- **Decision:** Supabase Auth with email + password and Google (GitHub later through the same callback). `profiles.github_login` becomes `display_name` + `avatar_url`, filled from any provider. `email` stays copied in `profiles` and a trigger keeps it in sync; linked logins live in `auth.identities`. Learners may also update `display_name`.
- **Why:** learners can't read `auth.users`, and the Play Stats roster and learner pages need the email and name in one query. A copy table for identities would duplicate what Supabase already keeps.
- **Rejected:** reading email from `auth.users` on every request (needs the service role everywhere); a `user_identities` table.
- Plan and edge cases: `docs/plans/auth.md`.

## 2026-10-29 · Agent tooling, Play Stats API, live backend

- **Decision:** adopt the 8x template's agent setup: AGENTS.md holds the rules, a SessionStart brief, SessionEnd transcripts in `.claude-logs/`, git hooks (secrets, commit messages, pre-push gates) and `docs/rules/`.
- **Why:** one rule file every agent reads; transcripts can be reviewed on the branch next to the change; the hooks catch secrets and bad commit messages before CI does.
- **Decision:** add the Play Stats API per `docs/PLAY_API.md`.
- **Why:** the 8x stats dashboard reads each play's numbers from it.
- **Backend:** one Supabase project in ap-south-1; migrations go live with `supabase db push`. A Vercel project with root `apps/web`, connected to this repo, so every PR gets a preview.
- **Why:** ap-south-1 is the closest region to Pakistan and Nepal.
- **Commits carry no co-author trailers**; the commit-msg check rejects them.
- **Why:** the authors want the commit history to show only the people who made the change.
- **History rewrite:** `main` was reworded once, on 2026-10-29, to remove co-author trailers. Branch protection was removed for a few seconds to force-push the reworded commit (same tree, same author), then restored with identical settings. Anyone with an older clone (Kasam, if he has one) runs `git fetch && git reset --hard origin/main`.
- **Rejected:** PostHog analytics, deferred: there is no personal PostHog project yet.
- Pages and dashboard are planned in `docs/plans/pages-and-dashboard.md`, built after the design system. **Done:** shipped; the plan is kept for history.

## 2026-10-29 · `allowImportingTsExtensions` in `apps/web`

- **Decision:** `apps/web/tsconfig.json` sets `allowImportingTsExtensions: true`. Pipeline code and tests import siblings with the `.ts` extension (`./parser.ts`).
- **Why:** `node --test --experimental-strip-types` runs the files as written and needs the extension, the same as `packages/shared`. Without the flag `tsc` rejects those imports. The web tsconfig already has `noEmit`, which the flag requires, so it changes nothing in the Next.js build.
- **Rejected:** a separate tsconfig for tests (two configs to keep in sync); a test runner like vitest (new dependency for one parser).

## 2026-10-29 · Redaction in the parser

- **Decision:** parser output is redacted before storing: API keys/tokens (JWTs, `sk-`, `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`, `AIza`, Bearer, Basic auth) and long letters+digits strings → [REDACTED]; `NAME=value` where NAME contains KEY, TOKEN, SECRET, PASSWORD or PASSWD → `NAME=[REDACTED]` (value is a quoted string or a run of non-space characters); emails → [EMAIL]; /Users/<name>/ and /home/<name>/ → ~/ (the name stops at shell operators, so `cd /Users/jane&&pnpm test` keeps its command). Hex runs of exactly 40 or 64 characters are left intact. Read paths get only the home-path rule so the path structure stays.
- **Why:** the repo is public and session logs carry emails and paths with the user's name. Second layer after "never paste secrets" + the pre-commit scan. The JWT rule goes first so a JWT whose signature starts with `sk-` is redacted whole. Git SHA-1/SHA-256 hashes are evidence, so they are kept; other hex lengths (such as 32) are still redacted.
- **Rejected:** a generic secret scanner (misses our own shapes such as home paths and emails, and flags path segments); redacting at display time instead of before storing (the raw text would sit in storage and in the repo); applying the full rule set to Read paths (the long-token rule would mangle path segments).
- **Known gaps:** a secret immediately after a "/" is skipped (so path segments aren't mistaken for tokens); Windows paths not covered; passwords embedded in URLs (`postgres://user:pass@host`) are not caught; a secret that is exactly 40 or 64 hex characters with no known prefix won't be caught, since those runs are skipped. Verified on the real Rapporteur log: 0 emails or user paths left in the events.

## 2026-10-28 · `flagged` and `hidden` on decision cards

- **Decision:** `flagged = true` when any evidence item has `verified: false`. `hidden = true` when no evidence item is verified; the row is kept and learners never see it.
- **Why:** hiding an unproven card protects learners from studying an invented reason. Keeping the row lets the accuracy check count every extracted card, including the ones that failed the check.
- **Rejected:** deleting unverified cards (breaks the accuracy numbers); flagging only downgraded stated cards (misses inferred cards with a bad quote).
- Postgres generates both columns from `evidence`, so a writer can't store flags that disagree with it. `getEvidenceFlags()` in `packages/shared/src/decision.ts` applies the same rule in code, and `decisionCardSchema` rejects cards where they differ. Pending Kasam's confirmation.

## 2026-10-28 · Learners only read; the server writes

- **Decision:** RLS gives learners `select` on their own rows, except `decision_cards.model_answer` (the answer key). Answers, scores, reviews, cards and session deletes go through the server with the service role key.
- **Exceptions:** learners may update their profile's `timezone` and `notify_email` (column grants, nothing else) and delete their own CLI tokens to revoke them.
- **Why:** a learner who can write `answers.score` or `reviews.mastered` can fake progress. Session deletes stay on the server so the Storage object is removed with the row.
- **Ownership:** child rows reference their parent by `(id, user_id)`, so a card, answer or review can't belong to a different learner than its session.

## 2026-10-28 · pnpm monorepo, Tailwind v4, shadcn/ui, `@shadcn/lint`

- **Decision:** pnpm workspaces with `apps/web`, `packages/shared`, `packages/cli`. Tailwind v4 + shadcn/ui, with `@shadcn/lint` enforcing design-system rules.
- **Why:** both halves import one Decision schema. The lint rules give the agent a concrete fix when it restyles a component, which keeps the UI consistent across two people and their agents.

## 2026-10-28 · `main` protected

- **Decision:** pull request required, 1 approving review, stale approvals dismissed, conversations resolved, no force pushes, no deletion, admins included.
- **Why:** two people and two agents on one repo; every change gets a second pair of eyes.

## 2026-11-03 · Local visual redesign

Retune the existing semantic design tokens to warm neutral surfaces and a restrained botanical accent. Use a dark, technical marketing hero, an editorial sans display face, and the same controls and spacing across public, authentication and application screens. The orbital hero artwork is decorative SVG and honors reduced motion. UI primitives own their appearances; data access, authentication, model calls, schemas, review scheduling and APIs remain unchanged. Development stays local, with no commits or pushes.

## 2026-11-03 · Frost, explanatory motion and local design preview

Restore the original Frost palette and the selective Instrument Serif display face. Replace decorative orbital motion with a sample-backed, controllable pipeline and an interactive review journey that calls the existing scheduler. Redesign page compositions around the learner’s next action without changing queries, schemas, grading or authentication. Add an opt-in, loopback-only design-preview harness using synthetic fixtures; its screen navigator renders only in development when DESIGN_PREVIEW=1. No packages, real env files, session logs, commits or pushes are needed.

## 2026-11-03 · Larger scenes and demand-rendered illustrations

Use Phenomenon Studio’s scale and pacing as composition references while preserving Frost colors. The homepage uses broad visual chapters with GSAP transitions and custom Three.js decision sculptures. Scenes load near the viewport, render on demand, dispose GPU resources, and retain static SVG fallbacks. Reduced motion bypasses animated transforms. Application pages use more generous type and spacing, explicit open card variants, and the same illustration family. Existing product data, APIs, authentication and review rules remain unchanged. GSAP, its React hook, Three.js and Three.js types were approved by the user.

## 2026-11-04 · A continuous visual language after upstream sync

Fast-forwarded the local design branch to upstream 28f6bea before redesigning the new answer-first, project-level, and device-approval surfaces. Existing local source changes were preserved in a verified temporary backup; no commit was created. The marketing composition now uses Frost paper, a compact floating navigation, and one interactive illustrative session-to-decision-to-review demonstration. Source content is synthetic; actual unanswered cards still follow upstream retrieval-before-reveal rules. GSAP transitions are scoped and respect reduced motion. The Three.js object is a continuous three-checkpoint review loop, rendered only on changes and lazily loaded, with an SVG fallback.

## 2026-11-04 · Wispr palette and an automatically played illustrated journey

The user replaced the previous Frost color constraint with the palette at wisprflow.ai: cream #ffffeb, charcoal #1a1a1a, lavender #f0d7ff, green #034f46, coral #ff6c4c, and pink #ffbcf2. A late token layer maps those colors into existing semantic roles while keeping warning/failure labels explicit; this supersedes the original cold-only brand rule for this redesign. The homepage is now a continuous SVG illustration rather than a set of generic interface cards. GSAP coordinates four eight-second chapters without requiring clicks. A pause control, optional chapter navigation, reduced-motion still states, visibility suspension, and cleanup are part of the implementation. Product/auth/domain behavior remains the pulled upstream behavior.

The user's follow-up retained the warm cream/charcoal base but asked for a distinct identity in selected places. Main illustration and CTA accents now use periwinkle #d8d7f5, petrol #164f52 and soft coral #ec806a. The workspace's interactive violet family follows the periwinkle shift; other palette roles remain stable.

## 2026-11-04 · Project ownership and a shared learning language

The user approved a project-aware workspace: dashboard sessions, queue, quiz navigation and progress carry an exact repository scope in the URL. Repository names are preserved, and sessions with missing metadata have their own “No project” scope. The existing session → card → review/answer relationships provide the association; no schema change is required. Session pagination filters before limiting, and live lists ignore other projects. Learner queries still use RLS and named columns.

Ownership means `reviews.mastered`, earned after the full review ladder. Explained means a visible decision has at least one score-2 answer, counted once across its lifetime. Seven-day recall and 30-day answer activity remain separate, explicitly labeled measures. The scheduler remains unchanged: gaps of 1, 3 and 7 days produce a perfect run on days 0, 1, 4 and 11. Every project shares the existing five-answer daily allowance. Illustrations show these meanings without fictional ownership scores.

Dashboard, progress, review guidance, processing and empty states use cream/charcoal, periwinkle, petrol and soft coral. Open project rows connect the overview to each project’s actual sessions and owned decisions; a continuous drawn path explains the real stage counts. Mobile rows give status its own aligned line. Motion respects reduced motion.

Fetched main through b71a132 and integrated its source changes from #60 (interaction sounds) and #61 (production canvas). Cuelume installation was explicitly approved by the user. The source integration preserved local changes using a source-only backup in /tmp and excluded session-log files, so HEAD stays at 28f6bea and no commit or push was made. The new main commits remain visible as ahead in Git; their source content is already applied locally.

## 2026-11-04 · Control polish and a readable feedback sequence

The approved detail pass gives shared controls consistent corners, minimum button heights, hover/focus/disabled states and restrained motion. UI primitives own the new appearances. Project selection opens an anchored menu, works by keyboard and announces its pending state; it avoids a redundant navigation when the selected project is unchanged. The sidebar separates Learning from Workspace and uses a compact icon rail on desktop, with the existing modal navigation on phones. Recent-session metadata and account controls have their own spacing. The sign-out menu item now explicitly uses Base UI’s native-button mode while preserving POST sign-out.

Review keeps retrieval before reveal, paste prevention, grading and scheduling unchanged. Its pending and error states stay in context, without duplicate loading/success toasts covering the feedback on phones. Empty submissions return focus to the writing field; completed attempts focus the result heading. Feedback is an open reading sequence: outcome, the learner’s explanation and missing reasoning, why, example explanation, exact session evidence, next revisit and next action. Owned is shown only when the existing endpoint reports the completed ladder. A refresh after a saved answer keeps server-rendered counts current while preserving the client’s feedback. The pre-answer coaching aside steps away once feedback appears. Reduced motion removes displacement/spinning.

The Next development indicator is disabled only for the synthetic design preview, where it overlapped account controls; compilation and runtime errors still surface. No dependency, database, API, environment-file or scheduling changes were required.

## 2026-11-04 · Quiet interaction and clarity across the learning journey

The user explicitly removed sound from the redesign. All application sound imports, bindings, control attributes and toast playback hooks are removed. Existing visual focus, press, pending and success states carry interaction feedback. No packages were installed or environment files changed.

Received, processing, failed and cardless sessions now share an illustrated sequence: receive the session, find supported decisions, explain and revisit. Each state names what happened, what remains available and the real next action. Failed sessions link to other sessions and Support; no retry or reprocessing feature is implied. Processing has no invented percentage or ETA. Failed and processing rows can now be opened directly from the dashboard. Standalone empty-state illustrations participate in the layout so they cannot obscure the message.

Answered decision pages distinguish the reason, whether it was stated or inferred, the files and exact quotes. A shared evidence component labels each quote as matched or not matched and explains that the check is against the recorded session text. This avoids implying that a matched quote proves a technical decision correct. The reason and evidence still never reach an unanswered card before an attempt. Feedback uses unique heading IDs, including when several inline session questions are answered.

When a dashboard queue is empty, it reads the existing project-scoped empty-queue summary to show the actual next revisit or the shared daily limit. It claims ownership only for decisions that finished the review ladder. Progress labels state their units and time windows; answer attempts stay distinct from unique decisions. The local preview includes received and cardless sessions to inspect every processing outcome with synthetic data.

## 2026-11-04 · Temporary design sharing through the local computer

The user approved a shareable link without pushing or deploying to the main repository. `share:design` owns an installed ngrok agent and the synthetic preview process, obtains the exact HTTPS origin from the local agent API, and closes both on interruption. It does not install software, publish a Site or synchronize repository content.

Share mode uses development-only rewrites for sample-account entry and browser fixture requests, so public visitors never need a localhost connection. Server Supabase reads stay on loopback; the browser uses its public origin and the existing synthetic cookie name. The exact sharing hostname is allowed for Next development requests, and forwarded hosts keep server actions on their requesting origin. Fixture redirects remain allowlisted, remote origins are explicit, and the server-only fixture key is rejected through the shared forwarded host. The synthetic cookie is browser-readable only in sharing mode to support the existing browser client and realtime. Standard local preview behavior and production routing remain unchanged.

## 2026-11-04 · Dashboard reading order and interaction clarity

The dashboard presents one next review, then defined learning counts, project stages and recent sessions. “Explained” includes owned decisions, so these measures are labelled separately rather than presented as additive categories. Each project’s stage bar shows current starting, revisiting and owned counts from the existing review steps. Project rows have one full-row link and one keyboard stop. Decision counts remain in session descriptions on mobile. Shared status labels describe what is happening consistently in the sidebar and session rows.

Project selection preserves scroll and focus, displays the requested project immediately, and announces when the view changes. Mobile navigation closes after choosing a destination. Navigation indicators reserve their space; decorative arrival motion is short and removed when reduced motion is requested. These are presentation changes; review scheduling, scores, data access and the daily allowance are unchanged.

## 2026-11-04 · Project workbench and upstream source integration

Integrated upstream source changes through `3f9d96d`, including the typed database clients, CLI upload contract, cumulative review-day naming, ownership RPC, and Defend it routes. Reconciled these with the uncommitted redesign without Git commits or pushes. Env files and real session-log files were excluded from the source integration. Migration files were brought in as upstream source; no database migration was executed.

The dashboard leads with the actual session title, project and branch, followed by actions grounded in due reviews and failed sessions. A compact companion area carries review practice, explicitly defined ownership counts, and the optional timed defense. The defense draws from all projects and is labelled that way; it never advances spaced-review ownership. The existing `repo` dashboard query remains compatible with the scoped project selector. The synthetic demo now models defenses, permissions, compare-and-set transitions and ownership reads with per-visitor state. Real production spend protections remain intact; only the separate fake-data deployment uses its own non-spending transport.

References: [Graphite’s actionable inbox](https://graphite.com/docs/key-features), [Linear’s clear agent-state feedback](https://linear.app/developers/aig), and [Anthropic’s study of comprehension-focused AI use](https://www.anthropic.com/research/AI-assistance-coding-skills). These informed reading order and contextual practice; the interface makes no claim to measure shipping speed or production readiness. Interaction sound remains disabled.

## 2026-11-05 · A focused daily learning loop

The approved learner redesign uses warm neutral paper, one action/progress accent, 17px body text, a 16px supporting-text floor and 30–38px page headlines in both themes. A shared learner shell keeps normal navigation available while review and timed defense use a focused reading width. Card's learning variant and Textarea's writing variant own the unframed appearance; tokens supply the palette, spacing and type. Reduced motion removes displacement.

Today shows the actual capped queue, project rows and five recent sessions; the existing session history also has a dedicated protected route. Review preserves retrieval before reveal, server grading, paste prevention, the shared daily cap and the day 1/4/11 schedule. Answer keys never reach the front. Results show one example and session proof, with additional context behind disclosures. Keyboard and swipe advancement are available after an attempt. URL counters are presentation only; completion reads the real scoped and global queues so finishing one project cannot imply all projects are finished.

Defense retains its server deadlines and automatic submission, with a thin remaining-time bar instead of an alarming numeric countdown. Progress counts distinct visible decisions with a finished defense scored 2, scoped through the same project membership as ownership; defenses never advance the ownership ladder. Practice history stays available in a disclosure. Sessions keep unanswered reasons locked and proof collapsed; setup and settings retain their existing controls in a single reading column. No new learning rules, dependencies, schema changes or environment-file edits are needed.

## 2026-11-05 · An illustrated learner identity

The approved visual pass adds an original folded-paper bracket companion in five consistent poses, documented in ILLUSTRATIONS.md. Transparent project-owned WebP assets supply the character; code-native diagrams and project glyphs use theme tokens and actual progress. The guide introduces tasks and acknowledges completion, while active writing and timed defense remain focused. A single paper Card variant frames review without nested cards, and an inset variant owns the compact settings surfaces. Today, project progress, session decisions, setup, account entry and empty states share the same material and spacing language in both themes. Artwork is decorative and does not imply new features, invented achievements, or access to an answer before an attempt. Learning queries, grading, scheduling, timers and account actions are unchanged.

## 2026-11-05 · Emerald surfaces and illustrated project stages

The approved palette revision uses Wispr Flow's inspected #034f46 green as the dark hero surface, a deeper emerald canvas and navigation, warm cream text and a pale mint action/progress accent. Light mode keeps warm paper with the same green family. Shared theme tokens carry the change through controls, menus, account screens and the learner workspace; control boundaries and supporting text are checked for contrast.

The project ladder is now an ordered inventory of five paper illustrations: New, Day 1, Day 4, Day 11 and Owned. The illustrations identify stages; real per-project counts are rendered as HTML over them and are also included in accessible stage headings. Empty stages are quieter without implying they are locked. A bound stack identifies Owned, which still means a correct day 11 review. Container queries switch narrow project panels to a vertical reading order, including tablets with an expanded sidebar. No grading, schedule, ownership, defense, or query behavior changes.

The project picker is a clear Base UI field with its folder symbol inside the trigger. Session rows use the shared paper media variant and a gentle hover surface, while proof quotations use an editorial quote mark. All artwork remains decorative; answers stay hidden until an attempt. No dependencies, environment files or database contracts changed.

## 2026-11-05 · A professional daily engineering workspace

The approved refinement reserves the original companion for onboarding and empty states; active review, defense, project progress, sessions and account settings use a consistent sans-serif hierarchy. Forest neutrals replace saturated green card surfaces, with cream text in dark mode and one emerald family for actions and progress. Shared tokens tighten corners and reduce shadows across the whole learner site. Session media has a primitive-owned neutral variant.

Today previews the actual next queued decision beside its single review action. Project progress replaces paper props with a proportional distribution of the actual five review stages and exact accessible counts. Zero-count stages remain visible without suggesting a locked step; explained, owned and defended retain their separate meanings. Compact layouts respond to the project panel width rather than only the device viewport. These presentation changes do not alter queries, grading, schedules, daily limits, answer-key protection, or defense deadlines.

## 2026-11-05 · Expressive visuals for engineering learning

The approved follow-up keeps forest and cream foundations, adding restrained blue, violet and amber tokens to distinguish explanation, recall, final review and evidence. Original native SVG code-window/branch scenes and a compact bracket-display guide form a single theme-aware illustration system across Today, Review, defense, sessions, setup, account entry and empty states. Shared learning marks reinforce adjacent words; color is never the only label. Writing and server-timed questions remain the primary focus.

Ownership rings use the exact mastered/visible fraction; their larger center displays a rounded percentage. Five-stage distribution segments still reflect exact counts, now with matching stage iconography and restrained color. The existing 30-day practice-history data appears as an activity strip with all daily totals available to assistive technology; no streak, forecast or new score is inferred. Explained includes owned, while defended remains separate. The original raster companion assets are preserved, and no package, database, environment, grading or scheduling changes are needed.

References: GitHub's mascot guidance for a recognizable developer companion; Linear's cycle graph for direct data labels and color with clear meaning; Raycast's icon vocabulary for compact recognition. All artwork is original, and the interface preserves existing product capabilities.

## 2026-11-05 · Ownership story and a shared engineering design system

Integrated upstream source through `be81f75` into the existing uncommitted redesign, preserving local work with a separate source backup and without Git commits or pushes. This includes main's shared views, card history, retry handling and opt-in ownership reports. Migration files are source only; no database migration ran, and no environment files or real session logs were read or copied.

The approved ServerOS reference informs white and stone surfaces, cobalt actions, graphite dark mode, precise edges and native product demonstrations. Main's original underlined “Own” headline, evidence checking, redaction, day 1/4/11 story and painted desk footer remain the landing's creative foundation. A four-scene example introduces the existing learning journey, pauses for interaction and stays still under reduced motion; it uses synthetic content and no video.

Today leads with the actual due queue, then project ownership and recent sessions. Review reveals missing points, an example and proof only after an attempt; defense retains server deadlines and automatic submission. Project progress uses exact stage distributions, lifetime explained counts and distinct defended counts, with card history and practice behind quiet disclosures. Project selection carries through review and session links. Shared theme tokens and primitive variants style the full learner site, setup, settings and auth at phone widths. No new learning rules, sound, packages or fabricated product metrics are introduced.

The separate Vercel design demo uses synthetic per-visitor state and fake grading; the repository retains real production authorization and spend guards. Report sharing is off by default, only selected projects are shown, and the demo adapter applies the same server-only link-regeneration boundary. Local browser checks cover light/dark desktop and phone layouts, review and defense flows, project totals and report privacy.

Production verification found the previous cached CSS bundle omitted the new imported theme despite correct uploaded source hashes. The final theme is therefore an explicit global stylesheet import in the root layout, after the base stylesheet, so it has its own tracked build dependency. Browser QA checks the actual cobalt/graphite token values as well as layout and interaction.

## 2026-11-06 · Practice calendar before ownership

The approved Progress refinement brings the existing 30-day answer history directly below project navigation. A weekly contribution calendar uses the actual local ISO date for each day, with intensity based on answer counts; date/count details respond to hover, focus and tap. One tab stop and arrow-key exploration keep the thirty cells easy to navigate. The project filter, zero days and all answer totals are preserved, and no streak score or longer history is inferred. Outcome totals and session ownership remain available in Practice details. The shared activity button variant and theme tokens own its appearance in both themes.

## 2026-11-06 · A warm, illustrated ownership story

The approved direction uses Wispr Flow's inspected cream/forest relationship, editorial serif scale and restrained lavender, adapted to our own palette and existing Instrument Serif/Geist fonts. Main's ownership headline and hand underline, real evidence/privacy demonstrations, spaced-review story and painted footer remain the foundation. An original paper folio replaces the generic desktop app frame, moving through an explicitly labelled synthetic session, own-word explanation, recall and project ownership. A pause control, focus/hover suspension and reduced-motion support keep the example readable. The headline and primary action remain visible on first paint; no video or scroll-gated content is introduced.

The original folded-bracket paper companion returns as a consistent decorative guide in the landing and learner acknowledgements, with compact artwork in Today and quiet writing screens. Existing optimized project-owned images are reused, so no generation service, package install, new font dependency or credentials are needed. Application layouts retain their focused task hierarchy while shared tokens carry the same cream, forest and mint palette through light and dark modes. Native data diagrams still use the exact existing values; no new learning rules or metrics are added.

Reference: https://wisprflow.ai/ (browser-inspected on 2026-11-06); its assets and copy are not reused.

Looping examples use the existing browser-preference subscription so reduced-motion changes stop the loop immediately, including after hydration; the explicit folio pause also stops its decorative thread.

### 2026-11-06 — Automatic journey and original cartoon agent

The marketing example previously froze on hover or focus, requiring interaction to communicate the learning loop. It now advances automatically while visible, with a noninteractive four-part progress rail and an explicit pause control; hidden browser tabs, offscreen sections and reduced-motion preferences stop it. It still demonstrates synthetic session content and never submits learner answers. The user rejected both the folded-paper guide and a realistic human study, so selected cartoon engineer/agent artwork now supplies the original meadow scene and a consistent compact guide. App motion stays restrained and data remains exact: the practice calendar stays above ownership, stage meters show each count's fraction of that project's decisions, and ownership/defense rules are unchanged. Prompt provenance is in ILLUSTRATIONS.md.

### 2026-11-06 — Make the illustrated partnership visible on arrival

The centered headline, supporting copy and full-width scene exceeded common laptop viewport heights, leaving only the character's hair visible. The first frame now places copy and artwork side by side on desktop and places the artwork directly after the headline on phones, before supporting copy and actions. Existing tokens set the smaller headline and spacing; the illustration is framed around both characters with a soft edge on peripheral grass, without changing the asset. The first-frame artwork is immediately opaque rather than relying on a scroll entrance. Browser measurements verify that the complete art frame and main action fit at 1024×600, 1366×650 and 320×640, alongside larger sizes in both themes. Learning behavior and the automatic journey remain unchanged.

### 2026-11-06 — Connected product story and visual dashboard cards

The landing's large folio beside a mascot obscured how the product works. The original main composition (finished session, setup/checks, review) is now one coordinated four-moment story: a single shared-layout decision moves from its source to evidence and then to explanation; typed text, quote confirmation and the ownership arc follow that same clock. All content is labelled synthetic, the original paper-stack art is preserved, and the separate illustrated hero stays visible on arrival. Phone layouts present the active scene in a stable 568px frame; reduced motion gives a static complete composition. Explicit pause and offscreen/background suspension remain.

The dashboard now uses opt-in session-card and tile-group variants, while the sessions page keeps its normal rows. Project cards pair exact ownership rings with separately labelled explained and owned fractions, avoiding ambiguous overlapping bars. The next-decision preview retains its real queue item and existing primary review link. Responsive grid placement is isolated to the new card variant so timestamps and statuses cannot overlap the title under the shared row's phone rules. No schema, scoring, schedule, data source, package, sound or environment configuration changed.

### 2026-11-06 — Centered text, illustrated partnership, then action

The landing hero now follows the requested vertical order: headline and a short supporting sentence, the original cartoon engineer and agent in their meadow, then the actions and trial note. A compact navigation bar, viewport-height typography and bounded illustration width keep the whole group visible on short laptop screens; phone layouts keep the same order with a larger central view of the characters. The secondary action goes directly to the connected learning story with a scroll offset for the sticky header. Browser assertions cover the visual order and full visibility at seven desktop/phone sizes in both themes. This is a layout change using the selected original artwork, with no new assets or product behavior.

### 2026-11-06 — Animate the meadow in independent layers

The user requested wind in the grass and a pet-like robot idle. A transparent background plate removes the baked-in robot; native SVG composites the stationary human, two foliage layers and the existing standalone agent. Low-amplitude CSS transforms sway the foliage and tilt/bob the robot with an occasional short hop and contact shadow. Visibility and reduced-motion preferences govern playback. The existing hero order, dimensions, actions and product behavior remain unchanged. Required typecheck/lint and 302 web tests passed, plus a focused desktop/phone motion preview.

## 2026-11-06 — Adult engineer and quieter Today workspace

Retain the warm meadow, independent wind and agent motion, but use an adult engineer in a forest hoodie and glasses. Reuse the same composition at a smaller scale on Today, replacing the oversized standalone mascot. Keep one next action, reduce nested surfaces and shadows, and separate project totals from clearly labelled learning bars. Counts, filters, review behavior and data contracts are unchanged.

## 2026-11-06 — One decision, changing context

Replace the landing diagram’s arrows and filling rails with a persistent decision sheet. Its context changes from source code to proof quote, own-word explanation with delayed feedback, then successive day 1/4/11 calendar leaves and an Owned confirmation. Keep synthetic content explicitly labelled, preserve the section footprint, pause offscreen/background/on request, and provide a complete static end state for reduced motion. No learner feature or scoring change.

## 2026-11-06 — Ice palette and spatial decision film

Approved replacement of the notebook tour: use an unframed spatial scene with dimensional code object, original source quote, example explanation before feedback, and staggered day 1/4/11 recall. The complete film loops automatically and pauses offscreen, in background tabs or on request; reduced motion shows a complete final state. Shopify Winter 2024 supplies the periwinkle, icy white and graphite reference, mapped through existing semantic tokens across marketing and learner routes. Original engineer and agent identities are preserved in versioned cool-palette artwork. No product feature, learner scoring or data-contract changes.

## 2026-11-06 — Open layouts and a complete first screen

Approved removal of the dotted hero kicker, decorative workflow plinths, nested evidence/privacy panels, project-tab row, repeated breadcrumb and repeated progress bars. The hero now fills the first viewport with adaptive type, complete artwork and visible actions, keeping the next section below the fold. Native Base UI project selection preserves existing URLs and optimistic navigation; project counts appear once in open sections. Evidence and privacy demos use only public synthetic content and short labelled illustrations. Preserve exact stage counts, project filtering, answer controls and reduced-motion behavior.

## 2026-11-06 — Full poster palette and illustrated explanations

Use sampled ivory, powder blue, dusty rose, salmon, coral, amber, peach and pale sage from the approved diffuse-light poster. Marketing applies translucent colour and fine static grain around original vector illustrations; learner routes remain neutral with muted terracotta actions and low-saturation chart colours. Replace the text-only workflow with layered session sheets, a source-verification stamp, a writing pencil and spaced calendar leaves. Evidence/privacy receive their own animated drawings. Keep the original adult engineer, restrained agent, first-viewport hero, compact project filter and all existing scoring/scheduling behavior. Progress column heights use real per-project stage counts relative to the project total, with numeric labels retained.

### Mature journey illustration and truthful stage markers

The marketing example keeps a single code decision in a stable product surface while source evidence, an explanation attempt and scheduled recall replace its context. Printed grain is stronger on marketing colour fields, with no added texture in learner writing areas. Progress now represents decisions with discrete small document markers rather than tiny percentage columns; empty stages stay empty and exact counts remain visible. No learning or scheduling behavior changes.

### Dense work surfaces and quicker marketing playback

Dashboard projects and recent sessions now share the desktop row below a compact review area. Learner light/dark surfaces are neutral rather than cream. A proportional ribbon shows the current distribution of project decisions, with exact stage counts below; it is not a percent-complete claim. Marketing phases advance every 3.1 seconds and each result completes within that window. Recall uses date typography, evidence a source annotation, and privacy two filtering lenses rather than cartoon props. No behavior or schedule changes.
