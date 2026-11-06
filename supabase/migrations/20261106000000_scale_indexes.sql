-- Indexes for the reads that stop scaling, found by the load test (scripts/load-test, docs/LOAD_TEST.md). Indexes only:
-- no column, policy or grant changes, so packages/shared is untouched.
--
-- The root cause of the worst two: RLS adds `user_id = auth.uid()` to every table a learner query touches. Where a
-- join looked rows up by card_id or session_id alone, Postgres ANDed that lookup with the learner's whole user_id
-- index on every loop, so a learner with 55k cards paid 55k x 55k. learner_ownership() took 98 s for that learner and
-- deleting their account 105 s. An index on the foreign key's own columns, (card_id, user_id) and
-- (session_id, user_id), answers both conditions in one probe.

-- answers by card for the owner: learner_ownership(), defendableCount and the cascade when a card is deleted.
-- Replaces answers_card_idx, which it covers.
create index answers_card_user_idx on public.answers (card_id, user_id);
drop index public.answers_card_idx;

-- decision_cards by session for the owner: every card read that joins from sessions under RLS, and the cascade when
-- a session is deleted.
create index decision_cards_session_user_idx on public.decision_cards (session_id, user_id);

-- reviews by learner. reviews_due_idx is partial (not mastered), so getProgress, getCardPath, the daily cron, the
-- public report and the account cascade read the whole table through the primary key.
create index reviews_user_card_idx on public.reviews (user_id, card_id);

-- decision_cards by learner including hidden cards. decision_cards_user_idx is partial (not hidden) for the learner
-- policy, so the service role and the cascade from profiles couldn't use it.
create index decision_cards_user_id_idx on public.decision_cards (user_id, id);

-- A learner's recent visible cards: the review queue's new cards and the daily cron. Without it, reviews_user_card_idx
-- above tempted the planner into hash-joining all of a heavy learner's reviews (queue.recent 3x slower at 100x).
create index decision_cards_user_created_idx on public.decision_cards (user_id, created_at) where not hidden;

-- answers by learner in id order: the fetchAll pages of getProgress, defendableCount and the Play Stats roster.
create index answers_user_id_idx on public.answers (user_id, id);

-- The stuck-upload sweep (failStuckSessions) looks for a handful of pending sessions; without this it reads them all.
create index sessions_pending_idx on public.sessions (created_at) where status = 'pending';
