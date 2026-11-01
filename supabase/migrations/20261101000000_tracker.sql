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
  details text, -- shown when the row is expanded; technical notes, links
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

-- The V1 finish list from 1 Nov 2026.
insert into public.tracker_tasks (section, position, owner, title, details) values
  ('Tonight (Sun 1 Nov)', 10, 'zia', 'Merge #27 (extraction)',
   'CI green, 18/18 threads resolved. Fixes in 7c12298: retry sends previous_answer and waits 60 s for Groq''s 8k tokens/min.'),
  ('Tonight (Sun 1 Nov)', 20, 'kasam', 'processSession PR, then Zia reviews and merges',
   'Replace the stub in apps/web/src/lib/pipeline/process.ts, keep the signature.
download raw_path → parse + redact → extractCards → checkEvidence → one decision_cards insert → ready.
Any throw → failed with a learner-readable error.
Log {session_id, extracted, kept}, counts only.
0–2 kept cards still means ready (the empty state covers 0).'),
  ('Tonight (Sun 1 Nov)', 30, 'kasam', 'CLI login and push',
   'login: paste the sc_ token from /setup, store in ~/.session-coach/config.json (mode 600).
push <file|--latest>: gzip, then POST /api/sessions → PUT the signed URL → POST /api/sessions/<id>/process. Handle the 409 resume.'),
  ('Tonight (Sun 1 Nov)', 40, 'zia', 'Daily reminder cron via Resend',
   'GET /api/cron/daily-review, Vercel cron, Authorization: Bearer $CRON_SECRET.
Users with cards due today in their timezone and notify_email on.
Insert email_log (user_id, ''daily_review'', sent_on) first: the unique key stops a second email.
Tests: nothing due → no send; rerun → no second send.'),
  ('Tonight (Sun 1 Nov)', 50, 'zia', 'Big-session test: bigger model or split into chunks',
   'Measure 2–3 real logs against Groq''s 8k tokens/min. Pick Groq dev tier / OpenRouter (config only) or split at user prompts and merge the best 5. Record it in docs/DECISIONS.md.'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 60, 'kasam', 'Claude Code hook and worker, so a session uploads when it ends',
   'init + SessionEnd hook + detached worker (never blocks the agent), outbox for retries.'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 70, 'kasam', 'Move the dev scripts to scripts/',
   'run-extract.ts, alias-hooks.mjs, register-alias.mjs (from #27).'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 80, 'zia', 'Fill the /setup install commands from the CLI README',
   'Removes the TODO(zia) on the setup page.'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 90, 'both', 'Dry run of the full flow on prod',
   'CLI login → session ends → upload → cards appear through Realtime → review → grade → reminder email arrives.
Two repos: one small, one real.'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 100, 'zia', 'Fix whatever the dry run breaks', null),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 110, 'zia', 'Update the README Status table',
   'CLI, card making and email will all be live.'),
  ('Tomorrow morning (Mon 2 Nov, before the call)', 120, 'zia', 'Local cleanup',
   'Delete the local test user grader@example.test; commit or delete docs/plans/prompts/.'),
  ('Mon 2 Nov: feedback call', 130, 'both', 'Live demo, then collect feedback', null),
  ('After Mon (until Fri 6 Nov)', 140, 'both', 'Polish from the feedback, then the final demo',
   'Accuracy check on 5 real sessions (evals/extraction), 375px + dark pass, demo clip, submit.'),
  ('After Mon (until Fri 6 Nov)', 150, 'zia', 'Optional: Google brand verification', null),
  ('V2: teams (after the trial)', 160, 'zia', 'Decide the 6 team rules',
   'What the team sees, whether admins read answer text, leaving, roles, who sees whom, billing. Draft in sources/v2-teams.md (local).');
