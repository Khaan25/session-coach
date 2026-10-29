-- Session Coach initial schema.
-- Rule: learners read only their own rows. Every write except profile settings and token
-- revocation goes through the server with the service role key, so a learner can't set their
-- own scores or card flags.

-- profiles -------------------------------------------------------------------
/* One row per learner: the app's own copy of who they are and how they want to be reminded. */
create table public.profiles (
  /* Same id as the Supabase auth user; deleting the account removes the profile and everything below it */
  id uuid primary key references auth.users (id) on delete cascade,
  /* GitHub handle shown in the app (dropped later in favour of display_name) */
  github_login text,
  /* Where review reminders are sent */
  email text,
  timezone text not null default 'UTC', -- so "due today" means the learner's today
  /* Learner's opt-in for Session Coach emails */
  notify_email boolean not null default true,
  /* When the learner signed up */
  created_at timestamptz not null default now()
);

-- Creates the profile row on sign-up.
/* Runs on every new sign-up so a learner has a profile before their first page load.
 * security definer lets it write public.profiles from the auth schema's insert;
 * the empty search_path forces fully qualified names so it can't be hijacked. */
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  /* Copies the new user's id, GitHub handle and email into their profile */
  insert into public.profiles (id, github_login, email)
  values (new.id, new.raw_user_meta_data ->> 'user_name', new.email);
  /* Trigger functions must return the row; returning it lets the sign-up proceed */
  return new;
end;
$$;

/* Fires the function above once per row inserted into auth.users, after the user exists */
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- cli_tokens (Kasam) ---------------------------------------------------------
/* Personal tokens the CLI uses to upload sessions without a browser login. */
create table public.cli_tokens (
  /* Token id, used to list and revoke it */
  id uuid primary key default gen_random_uuid(),
  /* The learner the token uploads for; removed with their profile */
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique, -- sha256 of the token; the raw token is never stored
  /* Learner's name for the token, e.g. which laptop it lives on */
  label text,
  /* Last upload made with it, so stale tokens are easy to spot and revoke */
  last_used_at timestamptz,
  /* When the token was issued */
  created_at timestamptz not null default now()
);
/* Speeds up listing a learner's tokens on the settings page */
create index cli_tokens_user_idx on public.cli_tokens (user_id);

-- sessions (Kasam) -----------------------------------------------------------
/* One uploaded coding-agent session, from upload through card generation. */
create table public.sessions (
  /* Session id inside Session Coach */
  id uuid primary key default gen_random_uuid(),
  /* Owner of the session; removed with their profile */
  user_id uuid not null references public.profiles (id) on delete cascade,
  external_id text not null, -- Claude Code session_id
  /* Which coding agent wrote the log, since each has its own log format */
  agent text not null default 'claude-code' check (agent in ('claude-code', 'codex')),
  /* Short title from the log, when the agent wrote one */
  title text,
  /* Working directory the session ran in */
  repo text,
  /* Git branch the session ran on */
  branch text,
  /* When the session started, from the log */
  started_at timestamptz,
  /* Session length in minutes, never negative */
  duration_min integer check (duration_min >= 0),
  /* Number of events in the log, never negative */
  event_count integer check (event_count >= 0),
  raw_path text not null check (raw_path <> ''), -- Storage path of the redacted .jsonl.gz
  /* Pipeline progress: pending (uploaded), processing, then ready or failed */
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  /* Message shown to the learner when processing failed */
  error text,
  /* When the session was uploaded */
  created_at timestamptz not null default now(),
  unique (user_id, external_id), -- a repeat upload returns 409
  unique (id, user_id) -- target of the owner-preserving foreign key on decision_cards
);
/* Serves the dashboard's newest-first session list per learner */
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);

-- decision_cards (Kasam) -----------------------------------------------------
/* One decision from a session, turned into a question the learner must explain back. */
create table public.decision_cards (
  /* Card id */
  id uuid primary key default gen_random_uuid(),
  /* Session the decision came from; tied to its owner by the composite foreign key below */
  session_id uuid not null,
  /* Owner of the card; must match the session's owner */
  user_id uuid not null references public.profiles (id) on delete cascade,
  /* Order of the card on screen, 0-based */
  position smallint not null check (position >= 0),
  /* What the agent decided, in one sentence */
  decision text not null,
  /* Why it decided that */
  why text not null,
  /* stated: the agent or user gave the reason; inferred: the model guessed it */
  source text not null check (source in ('stated', 'inferred')),
  /* Quotes from the session that back the decision; at least one is required */
  evidence jsonb not null check (
    jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) > 0
    -- every item is an object with a boolean verified, so the generated flags can't misread it
    and not jsonb_path_exists(evidence, 'lax $[*] ? (@.type() != "object" || !exists(@.verified) || @.verified.type() != "boolean")')
  ),
    -- [{ event_index, quote, file, lines, verified }]
  /* Files the decision changed, for context on the card */
  files text[] not null default '{}',
  /* What the learner is asked to explain */
  question text not null,
  /* Answer key for grading; hidden from learners by the column grants below */
  model_answer text not null,
  -- Derived from evidence so a writer can't store flags that disagree with it.
  -- Same rule as getEvidenceFlags() in packages/shared/src/decision.ts.
  flagged boolean generated always as (jsonb_path_exists(evidence, '$[*] ? (@.verified != true)')) stored,
  hidden boolean generated always as (not jsonb_path_exists(evidence, '$[*] ? (@.verified == true)')) stored,
  /* When the card was generated */
  created_at timestamptz not null default now(),
  /* No two cards share a slot in the same session */
  unique (session_id, position),
  unique (id, user_id), -- target of the owner-preserving foreign keys on answers and reviews
  -- the card's owner must be its session's owner
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade
);
/* Speeds up loading a learner's visible cards; hidden cards are never read by learners */
create index decision_cards_user_idx on public.decision_cards (user_id) where not hidden;

-- answers (Zia) --------------------------------------------------------------
/* Every attempt a learner makes at explaining a card, kept for history and grading. */
create table public.answers (
  /* Answer id */
  id uuid primary key default gen_random_uuid(),
  /* Card being answered; tied to its owner by the composite foreign key below */
  card_id uuid not null,
  /* Learner who answered */
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_step smallint not null check (review_step between 0 and 3), -- 0 first try, 1-3 = day 1/3/7
  /* What the learner wrote */
  answer text not null,
  score smallint not null check (score in (0, 1, 2)), -- wrong, partly, got it
  /* What the grader said the answer left out, if anything */
  missing text,
  /* When the learner answered */
  created_at timestamptz not null default now(),
  /* Answer and card must belong to the same learner; removed with the card */
  foreign key (card_id, user_id) references public.decision_cards (id, user_id) on delete cascade
);
/* Speeds up loading the answer history of one card */
create index answers_card_idx on public.answers (card_id);
/* Speeds up activity queries such as last-seen and retention */
create index answers_user_created_idx on public.answers (user_id, created_at desc);

-- reviews (Zia): one row per card, drives the day 1/3/7 schedule --------------
/* Spaced-repetition state per card: which review is next and when. */
create table public.reviews (
  /* Card this schedule belongs to; one schedule per card */
  card_id uuid primary key,
  /* Learner who owns the card */
  user_id uuid not null references public.profiles (id) on delete cascade,
  /* Reviews completed so far: 0 first try, then day 1, 3 and 7 */
  step smallint not null default 0 check (step between 0 and 3),
  due_on date, -- null once mastered
  /* Score of the latest attempt, using the same 0/1/2 scale as answers */
  last_score smallint check (last_score in (0, 1, 2)),
  /* True once the learner has passed every review step */
  mastered boolean not null default false,
  /* Last time the schedule moved */
  updated_at timestamptz not null default now(),
  check (mastered = (due_on is null)), -- a pending card always has a due date
  /* Schedule and card must belong to the same learner; removed with the card */
  foreign key (card_id, user_id) references public.decision_cards (id, user_id) on delete cascade
);
/* Finds the cards due today for each learner, skipping mastered ones */
create index reviews_due_idx on public.reviews (user_id, due_on) where not mastered;

-- email_log (Zia) ------------------------------------------------------------
/* Record of emails sent, so the daily cron can tell what already went out. */
create table public.email_log (
  /* Log entry id */
  id uuid primary key default gen_random_uuid(),
  /* Learner the email went to */
  user_id uuid not null references public.profiles (id) on delete cascade,
  /* Which email: the lesson is ready, or the daily review reminder */
  kind text not null check (kind in ('lesson_ready', 'daily_review')),
  /* Day the email was sent, used for the once-per-day rule */
  sent_on date not null,
  /* Message id from Resend, to trace delivery problems */
  resend_id text,
  unique (user_id, kind, sent_on) -- a cron rerun never sends twice
);

-- Row-level security ---------------------------------------------------------
/* Turns on row-level security for profiles: with no matching policy below, learners see nothing */
alter table public.profiles enable row level security;
/* Turns on row-level security for CLI tokens: with no matching policy below, learners see nothing */
alter table public.cli_tokens enable row level security;
/* Turns on row-level security for sessions: with no matching policy below, learners see nothing */
alter table public.sessions enable row level security;
/* Turns on row-level security for decision cards: with no matching policy below, learners see nothing */
alter table public.decision_cards enable row level security;
/* Turns on row-level security for answers: with no matching policy below, learners see nothing */
alter table public.answers enable row level security;
/* Turns on row-level security for review schedules: with no matching policy below, learners see nothing */
alter table public.reviews enable row level security;
/* Turns on row-level security for the email log: with no matching policy below, learners see nothing */
alter table public.email_log enable row level security;

/* Learners can read only their own profile */
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
/* Learners can update only their own profile row; the grant below limits which columns */
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Learners may change settings only, not email, github_login or created_at.
/* Removes the default right to update any profile column */
revoke update on public.profiles from anon, authenticated;
/* Gives back update rights on the two settings columns only */
grant update (timezone, notify_email) on public.profiles to authenticated;

/* Learners can see their own CLI tokens on the settings page */
create policy "read own tokens" on public.cli_tokens for select to authenticated using (user_id = (select auth.uid()));
/* Learners can revoke their own CLI tokens */
create policy "delete own tokens" on public.cli_tokens for delete to authenticated using (user_id = (select auth.uid()));

/* Learners can read only their own sessions */
create policy "read own sessions" on public.sessions for select to authenticated using (user_id = (select auth.uid()));
-- No learner delete on sessions: the server deletes the Storage object first, then the row.

/* Learners can read only their own cards, and never the hidden ones */
create policy "read own visible cards" on public.decision_cards for select to authenticated
  using (user_id = (select auth.uid()) and not hidden);
-- model_answer is the answer key: learners get every column except it, so select the columns
-- by name (select * fails). The server returns it after the learner answers.
/* Removes the default right to read every card column */
revoke select on public.decision_cards from anon, authenticated;
/* Gives back read rights on every column except model_answer */
grant select (id, session_id, user_id, position, decision, why, source, evidence, files, question,
  flagged, hidden, created_at) on public.decision_cards to authenticated;

/* Learners can read only their own answers */
create policy "read own answers" on public.answers for select to authenticated using (user_id = (select auth.uid()));
/* Learners can read only their own review schedules */
create policy "read own reviews" on public.reviews for select to authenticated using (user_id = (select auth.uid()));
-- email_log: server only, no learner policies.

-- Realtime: the dashboard listens to its own session status changes.
/* Streams sessions row changes so the dashboard updates when processing finishes */
alter publication supabase_realtime add table public.sessions;

-- Storage: private bucket for redacted session logs, server access only.
/* Creates the private sessions bucket; public = false means no anonymous downloads */
insert into storage.buckets (id, name, public) values ('sessions', 'sessions', false);
