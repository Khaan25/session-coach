-- Build tracker: the team's own to-do list at /tracker, in place of a project management tool.
-- Only tracker members (Zia and Kasam) can read it or tick tasks; learners never see it.
-- Members are added by hand in the SQL editor:
--   insert into public.tracker_members (user_id) select id from public.profiles where email = '<email>';

create table public.tracker_members (
  user_id uuid primary key references public.profiles (id) on delete cascade
);

create table public.tracker_tasks (
  id uuid primary key default gen_random_uuid(),
  section text not null check (char_length(section) between 1 and 100), -- a heading, like "Tonight (Sun 1 Nov)"
  position integer not null, -- order across the whole list; sections show in the order of their first task
  owner text check (owner in ('zia', 'kasam', 'both')), -- null: anyone
  title text not null check (char_length(title) between 1 and 300),
  details text, -- Markdown, shown when the row is expanded and copied by its copy button
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tracker_tasks_position_idx on public.tracker_tasks (position);

-- Runs as the table owner so the policies below can read tracker_members without a policy of their own.
create function public.is_tracker_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tracker_members where user_id = (select auth.uid()));
$$;

alter table public.tracker_members enable row level security;
alter table public.tracker_tasks enable row level security;

create policy "members read tasks" on public.tracker_tasks for select to authenticated
  using ((select public.is_tracker_member()));
create policy "members tick tasks" on public.tracker_tasks for update to authenticated
  using ((select public.is_tracker_member())) with check ((select public.is_tracker_member()));
-- Members may tick and untick only; tasks are added and edited in the SQL editor for now.
revoke update on public.tracker_tasks from anon, authenticated;
grant update (done_at, done_by) on public.tracker_tasks to authenticated;
-- tracker_members: no policies, server and SQL editor only.

-- Seed: the V1 finish list (1 Nov 2026, from the build guide) and V2 teams, which starts right after the demo.
insert into public.tracker_tasks (section, position, owner, title, details) values

('Tonight (Sun 1 Nov)', 10, 'zia', 'Merge #27 (extraction)', $md$
**PR:** [Khaan25/session-coach#27](https://github.com/Khaan25/session-coach/pull/27), by Kasam.

- The model returns 3–5 decisions, each with evidence `{ event: "E2", quote }`.
- `checkEvidence` drops any card without a grounded quote: verified, at least 5 words, from a prompt, a reply or a `DECISIONS.md` write.
- Fixed in `7c12298`: the retry sends `previous_answer` and waits 60 s (`RETRY_DELAY_MS`) for Groq's 8k tokens/min.

**Deferred by Kasam:** dev scripts to `scripts/` (task below), count log in `processSession`.

**Ready:** CI green, 18/18 threads resolved.
$md$),

('Tonight (Sun 1 Nov)', 20, 'kasam', 'processSession PR, then Zia reviews and merges', $md$
Replace the body of `apps/web/src/lib/pipeline/process.ts`; keep the signature. The route has already set `status = 'processing'` before calling it.

1. Download `raw_path` from the `sessions` bucket, gunzip.
2. `parseSession(raw)` → events (`E1`, `E2` …). Run `redact()` again: never trust the laptop alone.
3. Too big? Drop read results, cut long results to 500 chars (`RESULT_MAX_CHARS`), keep the last ~150k characters.
4. `extractCards(events, callModel)` → `checkEvidence(drafts, events)`.
5. Validate each row against `decisionCardSchema` (`packages/shared`), then **one** `insert` into `decision_cards` with `createAdminClient()`.
6. Set `status = 'ready'`. Any throw: `status = 'failed'`, `error` = one plain sentence, e.g. "We couldn't read this session's log."

**Also:**

- Log `{ session_id, extracted, kept }`, counts only, never quote text.
- 0–2 kept cards is still `ready`; the session page has an empty state for 0.
- Don't write `flagged` / `hidden` (generated) or any `reviews` / `answers` rows.
- Log how long each step takes; the function limit is 300 s.

**Done means:** a real transcript flips to `ready` with cards within a minute; a broken log flips to `failed` with a readable sentence.
$md$),

('Tonight (Sun 1 Nov)', 30, 'kasam', 'CLI login and push', $md$
Package: `packages/cli`.

| Command | Does |
| --- | --- |
| `session-coach login` | Asks for the `sc_` token from coach.ziaa.me/setup, saves `{ "url", "token" }` to `~/.session-coach/config.json` with mode `600`. |
| `session-coach push <transcript.jsonl>` | Redacts, gzips, uploads one session by hand. Build this first. |

**Upload, 3 calls** (the log never goes through Vercel, which rejects bodies over 4.5 MB):

```
① POST /api/sessions              Authorization: Bearer sc_…
   { external_id, agent, title, repo, branch, started_at, duration_min, event_count, size_bytes }
   → 201 { id, upload_url }
② PUT <upload_url>                Content-Type: application/gzip   → 200
③ POST /api/sessions/<id>/process Authorization: Bearer sc_…       → 202
```

| Response | CLI does |
| --- | --- |
| ① 409 `{ id }` | already done: mark sent |
| ① 409 `{ id, upload_url }` | resume at ② |
| ① 401 | tell the user to run `login`; don't retry |
| ① 400 / 413 | log it; don't retry |
| ③ 202 / 409 | mark sent |
| ③ 422 | start again at ① |
| 5xx / network | 3 tries (1 s, 4 s, 10 s), then outbox |

**Rules:** never print the token; never upload a file that wasn't redacted. 50 MB is the Storage limit.
$md$),

('Tonight (Sun 1 Nov)', 40, 'zia', 'Daily reminder cron via Resend', $md$
Route: `GET /api/cron/daily-review` (`apps/web/src/app/api/cron/`), scheduled by Vercel cron.

- Auth: `Authorization: Bearer $CRON_SECRET`, anything else is 401.
- Pick users with cards due today **in their own `timezone`** and `notify_email = true`.
- Insert `email_log (user_id, 'daily_review', sent_on)` **before** sending: the unique key `(user_id, kind, sent_on)` stops a second email on a rerun.
- Send with Resend from `noreply@coach.ziaa.me`; store `resend_id`.

**Tests:**

- nothing due → no send
- rerun the same day → no second send
- `notify_email = false` → skipped
$md$),

('Tonight (Sun 1 Nov)', 50, 'zia', 'Big-session test: bigger model or split into chunks', $md$
Groq free tier is **8k tokens/min**, and extract and grade share one quota (`MODEL_PROVIDER` is one setting). A 35-event session used ~6k tokens; the ~150k-character trim is ~37k tokens.

1. Run 2–3 real logs and record tokens per session.
2. Pick one:
   - a bigger provider: Groq dev tier or OpenRouter, config only in `callModel`
   - split at user prompts, extract from each part, keep the 5 best decisions
3. Record the choice and the numbers in `docs/DECISIONS.md`.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 60, 'kasam', 'Claude Code hook and worker, so a session uploads when it ends', $md$
| Command | Does |
| --- | --- |
| `session-coach init` | Adds our `SessionEnd` hook to `~/.claude/settings.json` without removing the user's other hooks. Running it twice must not add it twice. |
| `session-coach hook` | Reads `{ session_id, transcript_path }` from stdin, spawns the worker with `detached: true` and `unref()`, exits at once (~50 ms). |

**Worker:**

- Same `redact()` as the server (share it, don't fork the rules), gzip, then the 3 upload calls.
- Each call: 3 tries with 1 s, 4 s, 10 s waits. Still failing: save to `~/.session-coach/outbox/`, send next time.
- After ③ succeeds (or ① says done), append the `session_id` to `~/.session-coach/sent` and skip it next time.

**Done means:** after a normal Claude Code session ends, it shows up on the dashboard with no command typed.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 70, 'kasam', 'Move the dev scripts to scripts/', $md$
From #27: `run-extract.ts`, `alias-hooks.mjs`, `register-alias.mjs` live in `apps/web/src/lib/pipeline/` and ship next to app code. Move them to `scripts/` and update the `package.json` script that runs them.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 80, 'zia', 'Fill the /setup install commands from the CLI README', $md$
`apps/web/src/app/(app)/setup/page.tsx` still has placeholder commands (`TODO(zia)`). Copy the real install, `login` and `init` commands from Kasam's CLI README once it lands.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 90, 'both', 'Dry run of the full flow on prod', $md$
On coach.ziaa.me, two repos: one small, one real.

1. `session-coach login` with a fresh token from /setup
2. Work in the repo; the session ends
3. Upload happens by itself (or `session-coach push` as fallback)
4. Dashboard flips `pending` → `processing` → `ready` through Realtime, no refresh
5. Open the session: 3–5 cards, or the empty state
6. Review → explain one back → graded 0/1/2 with what was missing
7. Next morning: one reminder email

Note what broke, with the session id, in the task below.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 100, 'zia', 'Fix whatever the dry run breaks', null),

('Tomorrow morning (Mon 2 Nov, before the call)', 110, 'zia', 'Update the README Status table', $md$
The CLI, card making and the daily email go from "in progress" / "next" / "planned" to live. Also drop the "aren't live yet" line at the top of How it works.
$md$),

('Tomorrow morning (Mon 2 Nov, before the call)', 120, 'zia', 'Local cleanup', $md$
- Delete the local test user `grader@example.test` (local stack only).
- Commit or delete the untracked `docs/plans/prompts/`: it fails `oxfmt` and blocks pushes.
$md$),

('Mon 2 Nov: feedback call', 130, 'both', 'Live demo, then collect feedback', $md$
Show one real session: `push` → `ready` with cards → explain one back → graded. If `push` isn't ready, Zia uploads with `curl` so the demo still runs. Write the feedback down as tasks here.
$md$),

('After Mon (until Fri 6 Nov demo)', 140, 'kasam', 'Accuracy check on 5 real sessions', $md$
Zia reviews. Local only in `evals/extraction/` (never commit real logs).

1. For each of 5 real sessions, write down the 3–5 decisions you'd pick by hand.
2. Run extraction and compare.
3. Report: how many cards were kept (grounded), how many matched yours.
4. Fix the prompt (`EXTRACT_INSTRUCTIONS`, one exported constant) and rerun.
$md$),

('After Mon (until Fri 6 Nov demo)', 150, 'both', 'Polish from the feedback', $md$
- Fixes from the Monday call
- One pass at 375px and in dark mode on every screen
$md$),

('After Mon (until Fri 6 Nov demo)', 160, 'both', 'Demo clip and submit', $md$
Record the full flow (session ends → cards → review → grade), post the clip, submit by Fri 6 Nov.
$md$),

('After Mon (until Fri 6 Nov demo)', 170, 'zia', 'Optional: Google brand verification', null),

('V2: teams (right after the demo, from Sat 7 Nov)', 200, 'zia', 'Decide the 6 team rules', $md$
A company creates a team, invites developers, and sessions uploaded with the team's CLI token belong to the team. Admins (CEO, lead, hiring manager…) see every member's sessions, cards and scores.

| Rule | Recommendation |
| --- | --- |
| Which sessions the team sees | Only ones uploaded with a team token; personal ones stay private |
| Admins read answer text or only scores | Both, and members are told so on joining |
| Member leaves or is removed | Team tokens revoked at once; past team sessions stay with the team |
| Roles | `owner`, `admin`, `member`; many owners and admins, always one owner |
| Who sees whom | Admins see everyone; members never see peers |
| Billing | Not in the first version |
$md$),

('V2: teams (right after the demo, from Sat 7 Nov)', 210, 'zia', 'Schema and RLS for teams', $md$
One migration (team agreement first):

- `teams (id, name, slug unique, created_by, created_at)`
- `team_members (team_id, user_id, role in ('owner','admin','member'), joined_at)`
- `team_invites (id, team_id, email, role, token_hash unique, invited_by, expires_at, accepted_at)`
- `cli_tokens.team_id` and `sessions.team_id`, nullable; the session copies it from the token at upload
- `is_team_admin(team)`: `security definer`, `search_path = ''`

Add select policies for admins on `sessions`, `decision_cards`, `answers`, `reviews` through `team_id`. Never loosen the owner policies; `model_answer` stays revoked.

**Test:** extend `apps/web/tests/rls.test.ts` to two teams: admins read their team only, never personal sessions.
$md$),

('V2: teams (right after the demo, from Sat 7 Nov)', 220, 'zia', 'Create a team and invite members', $md$
- `/teams/new`: name and slug; the creator becomes `owner`.
- `/teams/[slug]/members`: invite by email and role, change roles, remove. The last owner can't leave.
- Invite email through Resend with a one-time link (7 days); `/join/[token]` signs in or up, then joins.
- Rate-limit invites with `lib/auth/rate-limit.ts`.
$md$),

('V2: teams (right after the demo, from Sat 7 Nov)', 230, 'kasam', 'CLI uploads under the team', $md$
- /setup: pick "Personal" or a team when creating a token; the token row gets `team_id`.
- `POST /api/sessions` copies the token's `team_id` to the session; 403 if the user left the team.
- `session-coach login` says which account it uploads to ("Uploading to team Acme").
- Removing a member deletes their team tokens.
$md$),

('V2: teams (right after the demo, from Sat 7 Nov)', 240, 'zia', 'Admin dashboard', $md$
- `/teams/[slug]`: one row per member: sessions this week, cards, % Explained on the first answer, day-7 recall, last active.
- `/teams/[slug]/members/[id]`: their sessions, cards, answers and scores (read-only).
- Team weak spots: the cards most often scored 0.
- Member side: a banner on /setup and the dashboard, "Sessions uploaded with this token are visible to Acme's admins."
$md$),

('V2: teams (right after the demo, from Sat 7 Nov)', 250, 'both', 'Ship checks for teams', $md$
- Two-team RLS test green in CI.
- E2E: owner invites → member joins → CLI push with a team token → admin sees the graded answer.
- Privacy policy and terms updated for team data.
- Account deletion: decide what happens to team sessions.
$md$);
