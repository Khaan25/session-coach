-- Tracker roadmap, 5 Nov 2026: the open work from the team board ("5. Where we stand, and what is next") and the
-- follow-ups from the 5 Nov code review. Adds tasks only; existing tasks and their ticks are untouched. Positions start
-- after the last seeded task (250), so these sections show after the earlier ones.

insert into public.tracker_tasks (section, position, owner, title, details) values

('Demo week (Wed 4 to Fri 6 Nov)', 300, 'zia', 'Ownership meter on the dashboard', $md$
"You own 12 of 30 decisions in session-coach. Up 2 this week."

- owned = `reviews.mastered`, total = visible cards, per `sessions.repo`. No new table.
- `levelOf` and `countOwned` are ready in `apps/web/src/lib/review/level.ts`.
- Contract on the board: `GET /api/progress/ownership` → `{ overall: { owned, total, ownedThisWeek }, repos: [...] }`.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 310, 'both', 'Defend it: screen, routes, `defenses` table', $md$
Agreed split (5 Nov): Kasam takes the `defenses` migration, the routes and the prompts; Zia takes the screen and the
ownership meter card.

- A random owned card, a 180 s timer, paste blocked, one AI follow-up (a fresh 120 s clock), then a grade.
- New table `defenses` (one unfinished per learner, server clock).
- Routes on the board: `POST /api/defend/start`, `POST /api/defend/[defenseId]/answer`, `/follow-up`.
- Labelled "defended (timed, follow-up)", never "verified".
- Not solid by Wed afternoon: show the canvas preview as next.
- Open: no real card is mastered before about 14 Nov (mastered on day 11). Either seed a demo account and label it
  "sample data" on screen, or let Defend use any card answered 2 at least once. Zia to decide.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 320, 'zia', 'Forgiving streak', $md$
A day counts when the learner answered at least one card, in `profiles.timezone`. One missed day in any rolling 7 keeps
the streak; a second ends it. Today without an answer never breaks it. No new table: a query over `answers`.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 330, 'zia', 'Daily email copy: "Yesterday added 4. 3 due, about 2 minutes."', $md$
Data per learner on the board: `newYesterday`, `due` (same rule as the queue, at most 5), `minutes` (about 40 s a card,
rounded up), `streak`. Built by `/api/cron/daily-review`; copy in `apps/web/src/emails/daily-review-email.tsx`.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 340, 'kasam', 'Publish CLI 0.3.0 (device login) and bump the sync hook pin', $md$
npm still has 0.2.0 (`npm view session-coach version`). After publishing, bump `session-coach@0.2.0` in
`packages/cli/README.md`, `apps/web/src/lib/setup/ai-prompt.ts` and the DECISIONS sync entry, once 0.3.0 `sync` is
checked to read configs written by 0.3.0 `login`.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 350, 'kasam', 'CLI sends repo and branch with each session', $md$
`sessions.repo` and `branch` exist, and the question level is read by `(user_id, repo)`, but the CLI doesn't send
them yet, so every session falls back to the simple level.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 360, 'kasam', 'Check 5 real sessions (why only 1 card?)', $md$
Run 5 real sessions through extraction and look at what `checkEvidence` drops. Counts only in the logs, never quotes.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 370, 'zia', 'Ownership report page (if time)', $md$
Opt-in public page: `profiles.report_on`, random `profiles.report_slug`. Never hidden cards, why, model_answer or
answers. Board contract: `GET /api/report/[slug]`.
$md$),

('Demo week (Wed 4 to Fri 6 Nov)', 380, 'zia', 'Demo script, flow, sample data and a backup recording', $md$
Wed evening: demo only. Thu 5: one dry run together, then the feedback call. Fri 6: demo.
$md$),

('From the 5 Nov code review', 400, 'both', 'Check the Upstash env vars in production before merging the review PR', $md$
Grading and processing now answer 503 in production when Upstash isn't configured (`lib/auth/spend-limits.ts`).
Confirm `UPSTASH_REDIS_REST_URL`/`TOKEN` (or `KV_REST_API_URL`/`TOKEN`) are set on the production deployment.
$md$),

('From the 5 Nov code review', 410, 'kasam', 'Agree the shared upload contract (`packages/shared/src/upload.ts`)', $md$
The upload request schema, `MAX_UPLOAD_BYTES` and the device poll constants moved to `packages/shared`, so the CLI
and web can't drift. Shared contract: needs Kasam's yes in the PR review.
$md$),

('From the 5 Nov code review', 420, 'both', 'Fence the card insert and `ready` in one RPC', $md$
The shortcut in `apps/web/src/lib/pipeline/process.ts`: a run replaced mid-insert can leave stale cards. Move the
insert and the `ready` update into one Postgres function if it is ever seen.
$md$),

('From the 5 Nov code review', 430, 'zia', 'Play Stats users route: 500 not 502, `field` on 400s', $md$
`apps/web/src/app/api/dashboard/v1/users/route.ts` breaks the error rule. Get the current contract from the stats
dashboard first (AGENTS.md); never change its shape from memory.
$md$),

('From the 5 Nov code review', 440, 'zia', 'Update the Excalidraw board', $md$
Out of date on the board:

- "Score 0 or 1 sends the card back to day 1, decide which": decided, a miss drops one level, a skip keeps it.
- "Model writes 3 to 5" and "1 : 3 to 5": up to 5, and 0 is a ready session with "No decisions found".
- `POST /api/review/answer` 200 shows `skipped`; the route returns `level` and `dropped`.
- "day 1, day 3, day 7": 1, 3 and 7 are gaps. Reviews land on days 1, 4 and 11; mastered on day 11.
$md$),

('From the 5 Nov code review', 450, null, 'Later: AI SDK `generateObject` and durable queues', $md$
Not done on purpose (DECISIONS 2026-11-05): `callModel`'s retry and 429 handling is tuned to Groq's free 8k tokens a
minute, and `after()` works. Revisit when leaving the free tier, or when the stale-card shortcut is seen.
$md$);
