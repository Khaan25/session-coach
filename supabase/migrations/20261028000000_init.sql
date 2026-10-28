-- Session Coach initial schema.
-- Rule: learners read only their own rows. Every write except profile settings goes through
-- the server with the service role key, so a learner can't set their own scores or card flags.

-- profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_login text,
  email text,
  timezone text not null default 'UTC', -- so "due today" means the learner's today
  notify_email boolean not null default true,
  created_at timestamptz not null default now()
);

-- Creates the profile row on sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, github_login, email)
  values (new.id, new.raw_user_meta_data ->> 'user_name', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- cli_tokens (Kasam) ---------------------------------------------------------
create table public.cli_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique, -- sha256 of the token; the raw token is never stored
  label text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- sessions (Kasam) -----------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  external_id text not null, -- Claude Code session_id
  agent text not null default 'claude-code' check (agent in ('claude-code', 'codex')),
  title text,
  repo text,
  branch text,
  started_at timestamptz,
  duration_min integer check (duration_min >= 0),
  event_count integer check (event_count >= 0),
  raw_path text not null, -- Storage path of the redacted .jsonl.gz
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, external_id) -- a repeat upload returns 409
);
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);

-- decision_cards (Kasam) -----------------------------------------------------
create table public.decision_cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position >= 0),
  decision text not null,
  why text not null,
  source text not null check (source in ('stated', 'inferred')),
  evidence jsonb not null, -- [{ event_index, quote, file, lines, verified }]
  files text[] not null default '{}',
  question text not null,
  model_answer text not null,
  flagged boolean not null default false, -- any evidence item failed the check
  hidden boolean not null default false,  -- no evidence item passed; kept for the accuracy check
  created_at timestamptz not null default now(),
  unique (session_id, position)
);
create index decision_cards_user_idx on public.decision_cards (user_id) where not hidden;

-- answers (Zia) --------------------------------------------------------------
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.decision_cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_step smallint not null check (review_step between 0 and 3), -- 0 first try, 1-3 = day 1/3/7
  answer text not null,
  score smallint not null check (score in (0, 1, 2)), -- wrong, partly, got it
  missing text,
  created_at timestamptz not null default now()
);
create index answers_user_created_idx on public.answers (user_id, created_at desc);

-- reviews (Zia): one row per card, drives the day 1/3/7 schedule --------------
create table public.reviews (
  card_id uuid primary key references public.decision_cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 3),
  due_on date, -- null once mastered
  last_score smallint check (last_score in (0, 1, 2)),
  mastered boolean not null default false,
  updated_at timestamptz not null default now()
);
create index reviews_due_idx on public.reviews (user_id, due_on) where not mastered;

-- email_log (Zia) ------------------------------------------------------------
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson_ready', 'daily_review')),
  sent_on date not null,
  resend_id text,
  unique (user_id, kind, sent_on) -- a cron rerun never sends twice
);

-- Row-level security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cli_tokens enable row level security;
alter table public.sessions enable row level security;
alter table public.decision_cards enable row level security;
alter table public.answers enable row level security;
alter table public.reviews enable row level security;
alter table public.email_log enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read own tokens" on public.cli_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own tokens" on public.cli_tokens for delete to authenticated using (user_id = (select auth.uid()));

create policy "read own sessions" on public.sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own sessions" on public.sessions for delete to authenticated using (user_id = (select auth.uid()));

create policy "read own visible cards" on public.decision_cards for select to authenticated
  using (user_id = (select auth.uid()) and not hidden);

create policy "read own answers" on public.answers for select to authenticated using (user_id = (select auth.uid()));
create policy "read own reviews" on public.reviews for select to authenticated using (user_id = (select auth.uid()));
-- email_log: server only, no learner policies.

-- Realtime: the dashboard listens to its own session status changes.
alter publication supabase_realtime add table public.sessions;

-- Storage: private bucket for redacted session logs, server access only.
insert into storage.buckets (id, name, public) values ('sessions', 'sessions', false);
