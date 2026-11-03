-- Answer first (docs/DECISIONS.md, 2026-11-04).
--
-- 1. A learner can't read a card's why or evidence before answering it. The page already left them out, but the
--    column grant let anyone with a session read them through the REST API. The server now reads both with the
--    service role, only for a card of the learner's that has a reviews row (apps/web/src/lib/cards/queries.ts), and
--    returns them in POST /api/review/answer. model_answer stays revoked (20261028000000_init.sql).
revoke select (why, evidence) on public.decision_cards from authenticated;

-- 2. "I don't know yet" is a skip, not a wrong answer: it keeps the card's step. Stored as its own flag so the
--    schedule never has to match the answer text.
alter table public.answers add column skipped boolean not null default false;
