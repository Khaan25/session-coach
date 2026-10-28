-- Session Coach initial schema.
-- Rule: learners read only their own rows. Every write except profile settings and token
-- revocation goes through the server with the service role key, so a learner can't set their
-- own scores or card flags.

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
create index cli_tokens_user_idx on public.cli_tokens (user_id);

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
  raw_path text not null check (raw_path <> ''), -- Storage path of the redacted .jsonl.gz
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, external_id), -- a repeat upload returns 409
  unique (id, user_id) -- target of the owner-preserving foreign key on decision_cards
);
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);

-- decision_cards (Kasam) -----------------------------------------------------
create table public.decision_cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position >= 0),
  decision text not null,
  why text not null,
  source text not null check (source in ('stated', 'inferred')),
  evidence jsonb not null check (
    jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) > 0
    -- every item is an object with a boolean verified, so the generated flags can't misread it
    and not jsonb_path_exists(evidence, 'lax $[*] ? (@.type() != "object" || !exists(@.verified) || @.verified.type() != "boolean")')
  ),
    -- [{ event_index, quote, file, lines, verified }]
  files text[] not null default '{}',
  question text not null,
  model_answer text not null,
  -- Derived from evidence so a writer can't store flags that disagree with it.
  -- Same rule as getEvidenceFlags() in packages/shared/src/decision.ts.
  flagged boolean generated always as (jsonb_path_exists(evidence, '$[*] ? (@.verified != true)')) stored,
  hidden boolean generated always as (not jsonb_path_exists(evidence, '$[*] ? (@.verified == true)')) stored,
  created_at timestamptz not null default now(),
  unique (session_id, position),
  unique (id, user_id), -- target of the owner-preserving foreign keys on answers and reviews
  -- the card's owner must be its session's owner
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade
);
create index decision_cards_user_idx on public.decision_cards (user_id) where not hidden;

-- answers (Zia) --------------------------------------------------------------
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_step smallint not null check (review_step between 0 and 3), -- 0 first try, 1-3 = day 1/3/7
  answer text not null,
  score smallint not null check (score in (0, 1, 2)), -- wrong, partly, got it
  missing text,
  created_at timestamptz not null default now(),
  foreign key (card_id, user_id) references public.decision_cards (id, user_id) on delete cascade
);
create index answers_card_idx on public.answers (card_id);
create index answers_user_created_idx on public.answers (user_id, created_at desc);

-- reviews (Zia): one row per card, drives the day 1/3/7 schedule --------------
create table public.reviews (
  card_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 3),
  due_on date, -- null once mastered
  last_score smallint check (last_score in (0, 1, 2)),
  mastered boolean not null default false,
  updated_at timestamptz not null default now(),
  check (mastered = (due_on is null)), -- a pending card always has a due date
  foreign key (card_id, user_id) references public.decision_cards (id, user_id) on delete cascade
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
-- Learners may change settings only, not email, github_login or created_at.
revoke update on public.profiles from anon, authenticated;
grant update (timezone, notify_email) on public.profiles to authenticated;

create policy "read own tokens" on public.cli_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own tokens" on public.cli_tokens for delete to authenticated using (user_id = (select auth.uid()));

create policy "read own sessions" on public.sessions for select to authenticated using (user_id = (select auth.uid()));
-- No learner delete on sessions: the server deletes the Storage object first, then the row.

create policy "read own visible cards" on public.decision_cards for select to authenticated
  using (user_id = (select auth.uid()) and not hidden);
-- model_answer is the answer key: learners get every column except it, so select the columns
-- by name (select * fails). The server returns it after the learner answers.
revoke select on public.decision_cards from anon, authenticated;
grant select (id, session_id, user_id, position, decision, why, source, evidence, files, question,
  flagged, hidden, created_at) on public.decision_cards to authenticated;

create policy "read own answers" on public.answers for select to authenticated using (user_id = (select auth.uid()));
create policy "read own reviews" on public.reviews for select to authenticated using (user_id = (select auth.uid()));
-- email_log: server only, no learner policies.

-- Realtime: the dashboard listens to its own session status changes.
alter publication supabase_realtime add table public.sessions;

-- Storage: private bucket for redacted session logs, server access only.
insert into storage.buckets (id, name, public) values ('sessions', 'sessions', false);
