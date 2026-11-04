-- Defend it: a timed defense of one card the learner has answered 2 at least once. 180 s to answer, then one AI
-- follow-up with a fresh 120 s, then a 0/1/2 grade. Labelled "defended (timed, follow-up)", never "verified".
-- Every timestamp is written by the API route from the server clock, never by the browser; the routes also enforce the
-- deadlines. The table is server-written only: a learner reads their own rows and can't write any.
-- No answer key lives here (model_answer stays on decision_cards), so a learner can read their whole row.

create table public.defenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null,
  -- answering: the 180 s clock runs; follow_up: the question is out and its 120 s clock runs;
  -- finished: graded; expired: a deadline passed with no answer, so the learner can start again.
  status text not null default 'answering' check (status in ('answering', 'follow_up', 'finished', 'expired')),
  started_at timestamptz not null default now(),
  answer text,
  answered_at timestamptz,
  follow_up_question text,
  follow_up_started_at timestamptz,
  follow_up_answer text,
  finished_at timestamptz,
  score smallint check (score in (0, 1, 2)), -- wrong, partly, got it
  -- a defense past the first answer has the answer and the question
  check (status not in ('follow_up', 'finished') or (
    answer is not null and answered_at is not null
    and follow_up_question is not null and follow_up_started_at is not null
  )),
  -- a finished defense has its follow-up answer, grade and end time; nothing else has a grade
  check ((status = 'finished') = (score is not null and follow_up_answer is not null and finished_at is not null)),
  -- the card's owner must be the defender
  foreign key (card_id, user_id) references public.decision_cards (id, user_id) on delete cascade
);
create index defenses_card_idx on public.defenses (card_id);
create index defenses_user_started_idx on public.defenses (user_id, started_at desc);
-- at most one unfinished defense per learner
create unique index defenses_one_unfinished_idx on public.defenses (user_id) where status in ('answering', 'follow_up');

alter table public.defenses enable row level security;

create policy "read own defenses" on public.defenses for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert, update or delete policy and no grant: the service role writes every row.
revoke insert, update, delete on public.defenses from anon, authenticated;
