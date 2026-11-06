-- The opt-in public ownership report at /r/<report_slug> (GET /api/report/[slug]).
-- `report_on` is off by default; the learner switches it on in /settings. The page shows only repos the learner ticked
-- (`projects.report_shown`, off by default), so private work stays off the page unless they choose it.
-- The public read is server only, with the service role, keyed by slug and `report_on`. Nothing here widens what a
-- learner can select: they still read only their own profile and projects (RLS).

-- 32 hex characters from gen_random_uuid() (122 random bits), so the link can't be guessed from the name. The default
-- is volatile, so adding the column fills every existing row with its own value.
alter table public.profiles
  add column report_on boolean not null default false,
  add column report_slug text not null default replace(gen_random_uuid()::text, '-', ''),
  add constraint profiles_report_slug_key unique (report_slug),
  add constraint profiles_report_slug_format check (report_slug ~ '^[0-9a-f]{32}$');

-- Learners switch the page on and off. A new slug is written by the server (service role), never the learner, so a
-- learner can't pick a guessable or someone else's slug.
grant update (report_on) on public.profiles to authenticated;

alter table public.projects add column report_shown boolean not null default false;

-- Ticking a repo with no projects row yet inserts one (the app updates, then inserts, as for question_level).
grant insert (report_shown), update (report_shown) on public.projects to authenticated;
