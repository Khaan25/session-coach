-- Question level per project: a learner picks how hard their questions are for each repo (simple, hard, complex).
-- A project is one (learner, sessions.repo) pair. Sessions with no repo have no project row and use 'simple'.
-- The pipeline reads the level with the service role when it writes a session's cards.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  repo text not null check (repo <> ''), -- matches sessions.repo exactly
  question_level text not null default 'simple' check (question_level in ('simple', 'hard', 'complex')),
  onboarded_at timestamptz, -- when the learner last chose a level (or "Not now"); null shows the dashboard prompt
  created_at timestamptz not null default now(),
  unique (user_id, repo)
);

alter table public.projects enable row level security;

create policy "read own projects" on public.projects for select to authenticated
  using (user_id = (select auth.uid()));
-- A learner can add a project only for a repo they have a session in, so the table never fills with made-up repos.
create policy "add own projects" on public.projects for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.sessions s where s.user_id = (select auth.uid()) and s.repo = projects.repo)
  );
create policy "update own projects" on public.projects for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Column grants: a learner names the repo once on insert, then may change only the level and onboarded_at.
revoke insert, update on public.projects from anon, authenticated;
grant insert (user_id, repo, question_level, onboarded_at) on public.projects to authenticated;
grant update (question_level, onboarded_at) on public.projects to authenticated;

-- The signed-in learner's distinct repos, so the app can list projects without reading every session row.
-- Runs as the caller (no security definer), so the sessions RLS policy still applies.
create function public.learner_repos() returns table (repo text)
language sql stable set search_path = '' as $$
  select distinct s.repo from public.sessions s
  where s.user_id = (select auth.uid()) and s.repo is not null and s.repo <> ''
  order by 1;
$$;
revoke execute on function public.learner_repos() from public, anon;
grant execute on function public.learner_repos() to authenticated;
