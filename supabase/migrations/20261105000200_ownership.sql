-- The dashboard's ownership meter, counted in Postgres: one row per repo instead of reading every card, session,
-- review and answer into the app. Definitions (DECISIONS, 2026-11-04 review ladder): explained = a card answered 2 at
-- least once, owned = `reviews.mastered`, total = visible cards, grouped by `sessions.repo` (null: sent without one).
-- Runs as the caller (no security definer), so every table's RLS policy still applies; `not c.hidden` matches the cards
-- policy and its partial index.
create function public.learner_ownership()
returns table (repo text, explained integer, owned integer, total integer)
language sql stable set search_path = '' as $$
  select s.repo,
         count(*) filter (where exists (
           select 1 from public.answers a where a.card_id = c.id and a.score = 2
         ))::integer,
         count(*) filter (where r.mastered)::integer,
         count(*)::integer
  from public.decision_cards c
  join public.sessions s on s.id = c.session_id
  left join public.reviews r on r.card_id = c.id
  where c.user_id = (select auth.uid()) and not c.hidden
  group by s.repo;
$$;
revoke execute on function public.learner_ownership() from public, anon;
grant execute on function public.learner_ownership() to authenticated;
