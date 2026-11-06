-- Synthetic learners for the load test, scaled by :scale (psql -v scale=10). Two axes grow together:
--   breadth: 50 x scale typical learners, each with 20 sessions (the cron, the admin roster and every index see more rows)
--   depth:   one heavy learner (the first) with 20 x scale sessions (every per-learner page reads more rows)
-- Fan-out inside a session follows the product's own limits (0 to 5 cards, up to 3 answers a card), so it doesn't scale.
-- The shapes follow the app: hidden and flagged cards come from evidence, reviews exist only for answered cards,
-- mastered reviews have no due date, defenses are finished, and a few sessions are stuck in pending or processing.
-- setseed makes every run of the same scale produce the same data.

\set ON_ERROR_STOP on
select setseed(0.42);

create temp table lt_users as
select i, gen_random_uuid() as id, case when i = 0 then 20 * :scale else 20 end as n_sessions
from generate_series(0, 50 * :scale) i;

-- The sign-up trigger (handle_new_user) creates each profile.
insert into auth.users (id, email, raw_user_meta_data, created_at)
select id, 'learner' || i || '@example.test', jsonb_build_object('full_name', 'Learner ' || i),
  now() - interval '200 days' + (i % 1000) * interval '1 minute'
from lt_users;

update public.profiles p
set timezone = (array['UTC', 'Asia/Karachi', 'America/New_York', 'Europe/Berlin'])[1 + floor(random() * 4)::int],
    notify_email = random() < 0.8,
    report_on = random() < 0.1,
    created_at = u.created_at
from auth.users u
where u.id = p.id;

insert into public.cli_tokens (user_id, token_hash, label)
select u.id, md5(u.id::text || t) || md5(t || u.id::text), 'laptop ' || t
from lt_users u, generate_series(1, 2) t;

insert into public.projects (user_id, repo, question_level, onboarded_at, report_shown)
select u.id, 'org/repo-' || r, (array['simple', 'hard', 'complex'])[r], now() - interval '30 days', random() < 0.5
from lt_users u, generate_series(1, 3) r;

-- Sessions over the last 180 days. 92% ready; the rest failed, or pending or processing if from the last day.
insert into public.sessions (user_id, external_id, title, repo, branch, started_at, duration_min, event_count,
  raw_path, status, error, processing_started_at, created_at)
select u.id, 'ext-' || u.i || '-' || s, 'Session ' || s || ': ' || left(md5(random()::text), 24),
  case when random() < 0.05 then null else 'org/repo-' || (1 + floor(random() * 3)::int) end,
  'feature/' || left(md5(random()::text), 8),
  t.at - interval '40 minutes', 10 + floor(random() * 120)::int, 20 + floor(random() * 400)::int,
  u.id || '/' || s || '.jsonl.gz', t.status,
  case when t.status = 'failed' then 'We could not read this session''s log.' end,
  case when t.status = 'processing' then t.at + interval '1 minute' end,
  t.at
from lt_users u
cross join lateral generate_series(1, u.n_sessions) s
cross join lateral (
  select now() - x.a * interval '180 days' as at,
    -- the daily sweep (failStuckSessions) has already failed unfinished sessions older than a day
    case when x.r < 0.92 then 'ready' when x.r < 0.95 or x.a * 180 > 1 then 'failed'
      when x.r < 0.98 then 'pending' else 'processing' end as status
  from (select random() + s * 0 as r, random() + s * 0 as a) x
) t;

-- 0 to 5 cards a ready session. 10% have no verified quote (hidden), another 10% one unverified quote (flagged).
insert into public.decision_cards (session_id, user_id, position, decision, why, source, evidence, files, question,
  model_answer, created_at)
select s.id, s.user_id, s.p - 1,
  'Use ' || left(md5(random()::text), 12) || ' instead of ' || left(md5(random()::text), 12) || ' for the cache layer',
  repeat('Because the read path needed ' || left(md5(random()::text), 16) || '. ', 4),
  case when random() < 0.7 then 'stated' else 'inferred' end,
  case
    when s.v < 0.1 then jsonb_build_array(jsonb_build_object('event_index', 3, 'quote', 'a quote that did not match', 'verified', false))
    when s.v < 0.2 then jsonb_build_array(
      jsonb_build_object('event_index', 3, 'quote', 'we picked this because it is simpler', 'verified', true),
      jsonb_build_object('event_index', 9, 'quote', 'a second quote that did not match', 'verified', false))
    else jsonb_build_array(jsonb_build_object('event_index', 3, 'quote', 'we picked this because it is simpler', 'verified', true))
  end,
  array['src/lib/' || left(md5(random()::text), 8) || '.ts'],
  'Why did the session choose ' || left(md5(random()::text), 12) || ' here?',
  repeat('The answer key explains ' || left(md5(random()::text), 16) || '. ', 5),
  s.created_at + s.p * interval '1 minute'
from (
  -- random() per row: a lateral subquery with no outer reference is evaluated only once.
  select s.id, s.user_id, s.created_at, p, random() as v
  from (
    select id, user_id, created_at, case when random() < 0.05 then 0 else 2 + floor(random() * 4)::int end as n
    from public.sessions where status = 'ready'
  ) s
  cross join lateral generate_series(1, s.n) p
) s;

-- A reviews row for 70% of the visible cards older than a day: 15% mastered, the rest due from 5 days ago to 11 ahead.
create temp table lt_reviewed as
select c.id as card_id, c.user_id, c.created_at, random() < 0.15 as mastered, floor(random() * 4)::int as step,
  1 + floor(random() * 3)::int as n_answers
from public.decision_cards c
where not c.hidden and c.created_at < now() - interval '1 day' and random() < 0.7;

insert into public.reviews (card_id, user_id, step, due_on, last_score, mastered, updated_at)
select card_id, user_id, case when mastered then 3 else step end,
  case when mastered then null else current_date + (floor(random() * 17)::int - 5) end,
  floor(random() * 3)::int, mastered, created_at + interval '1 day'
from lt_reviewed;

-- 1 to 3 answers a reviewed card, between the card's creation and now.
insert into public.answers (card_id, user_id, review_step, answer, score, missing, skipped, created_at)
select r.card_id, r.user_id, least(a - 1, 3), 'I think it was because ' || left(md5(random()::text), 24),
  floor(random() * 3)::int, case when random() < 0.5 then 'the trade-off' end, random() < 0.05,
  r.created_at + random() * (now() - r.created_at)
from lt_reviewed r
cross join lateral generate_series(1, r.n_answers) a;

-- A finished defense for 5% of the reviewed cards.
insert into public.defenses (user_id, card_id, status, started_at, answer, answered_at, follow_up_question,
  follow_up_started_at, follow_up_answer, finished_at, score)
select user_id, card_id, 'finished', t, 'my answer', t + interval '2 minutes', 'and then?', t + interval '2 minutes',
  'my follow-up', t + interval '4 minutes', floor(random() * 3)::int
from (select *, created_at + random() * (now() - created_at) as t from lt_reviewed where random() < 0.05) d;

-- The daily email log: the last 30 days for half the learners.
insert into public.email_log (user_id, kind, sent_on, resend_id)
select u.id, 'daily_review', current_date - d, md5(u.id::text || d)
from lt_users u, generate_series(1, 30) d
where u.i % 2 = 0;

analyze;
