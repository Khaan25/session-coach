-- The benchmark: the app's real reads and writes as SQL, timed server-side with EXPLAIN ANALYZE.
--
-- Each query is the SQL PostgREST builds for one supabase-js call in apps/web (source column): an embed is a lateral
-- join, `!inner` an inner one, the response a json_agg over the rows. Learner queries run as `authenticated` with the
-- learner's JWT claims, so RLS and auth.uid() apply as in production; server queries run as `service_role`.
-- kind: select runs once; paged runs as fetchAll does, 1000-row OFFSET pages until a short page; write runs inside a
-- subtransaction that is rolled back, so every sample sees the same data.
-- Placeholders ({uid}, {ids} ...) are filled per sample from lt_params: typical learners rotate, the heavy one repeats.

\set ON_ERROR_STOP on

create table lt_queries (name text primary key, source text not null, role text not null, kind text not null, sql text not null);
create table lt_params (persona text, n int, uid uuid, repo text, session_id uuid, ready_ids uuid[], slug text,
  ids uuid[], shown_repos text[]);
create table lt_results (tier int, phase text, query text, persona text, iter int, ms float8, pages int, rows bigint,
  max_page_ms float8);
create table lt_plans (tier int, phase text, query text, persona text, plan json);

insert into lt_queries values
-- Learner pages, through RLS.
('sessions.list', 'lib/sessions/queries.ts listSessions', 'authenticated', 'select', $q$
select id, title, repo, branch, started_at, duration_min, status, error, created_at from public.sessions
where user_id = {uid} order by created_at desc, id desc limit 21 offset 0$q$),
('sessions.list_repo', 'lib/sessions/queries.ts listSessions ?repo=', 'authenticated', 'select', $q$
select id, title, repo, branch, started_at, duration_min, status, error, created_at from public.sessions
where user_id = {uid} and repo = {repo} order by created_at desc, id desc limit 21 offset 0$q$),
('sessions.card_counts', 'lib/sessions/queries.ts withCardCounts', 'authenticated', 'select', $q$
select session_id from public.decision_cards where session_id = any({ready_ids})$q$),
('sessions.cardless', 'lib/sessions/queries.ts cardlessReason', 'authenticated', 'select', $q$
select id, status from public.sessions where user_id = {uid} order by created_at desc, id desc limit 1$q$),
('session.cards', 'lib/cards/queries.ts getSessionWithCards', 'authenticated', 'select', $q$
select c.id, c.position, c.decision, c.question, r.reviews from public.decision_cards c
left join lateral (select json_build_object('card_id', r.card_id) as reviews from public.reviews r where r.card_id = c.id) r on true
where c.session_id = {session_id} and c.user_id = {uid} order by c.position$q$),
('progress.cards', 'lib/progress/queries.ts getProgress', 'authenticated', 'paged', $q$
select c.id, c.session_id, row_to_json(s) as session from public.decision_cards c
inner join lateral (select s.repo from public.sessions s where s.id = c.session_id) s on true
where c.user_id = {uid} order by c.id$q$),
('progress.reviews', 'lib/progress/queries.ts getProgress', 'authenticated', 'paged', $q$
select card_id, step, mastered from public.reviews where user_id = {uid} order by card_id$q$),
('progress.answers', 'lib/progress/queries.ts getProgress', 'authenticated', 'paged', $q$
select card_id, score, created_at from public.answers where user_id = {uid} and created_at >= now() - interval '31 days'
order by id$q$),
('progress.sessions', 'lib/progress/queries.ts getProgress', 'authenticated', 'paged', $q$
select id, title, repo, branch from public.sessions where user_id = {uid} and status = 'ready'
order by created_at desc, id$q$),
('progress.ownership', 'lib/progress/queries.ts getOwnership (rpc learner_ownership)', 'authenticated', 'select', $q$
select * from public.learner_ownership()$q$),
('progress.card_path', 'lib/progress/queries.ts getCardPath', 'authenticated', 'select', $q$
select r.card_id, r.step, r.due_on, r.mastered, row_to_json(c) as card from public.reviews r
inner join lateral (
  select c.decision, c.created_at, row_to_json(s) as session from public.decision_cards c
  inner join lateral (select s.title, s.repo, s.branch from public.sessions s where s.id = c.session_id) s on true
  where c.id = r.card_id
) c on true
where r.user_id = {uid} order by r.mastered desc, r.step desc, r.due_on limit 1$q$),
('queue.recent', 'lib/review/queries.ts reviewQueue', 'authenticated', 'select', $q$
select c.id, c.decision, c.question, c.session_id, c.created_at, row_to_json(s) as session, r.reviews
from public.decision_cards c
left join lateral (select s.title, s.repo, s.branch from public.sessions s where s.id = c.session_id) s on true
left join lateral (select json_build_object('card_id', r.card_id) as reviews from public.reviews r where r.card_id = c.id) r on true
where c.user_id = {uid} and c.created_at >= now() - interval '7 days' order by c.created_at desc, c.position$q$),
('queue.answers', 'lib/review/queries.ts reviewQueue', 'authenticated', 'select', $q$
select created_at from public.answers where user_id = {uid} and created_at >= now() - interval '26 hours'$q$),
('queue.due', 'lib/review/queries.ts reviewQueue', 'authenticated', 'select', $q$
select r.step, r.due_on, row_to_json(c) as card from public.reviews r
left join lateral (
  select c.id, c.decision, c.question, c.session_id, c.created_at, row_to_json(s) as session from public.decision_cards c
  left join lateral (select s.title, s.repo, s.branch from public.sessions s where s.id = c.session_id) s on true
  where c.id = r.card_id
) c on true
where r.user_id = {uid} and r.mastered = false and r.due_on <= current_date order by r.due_on, r.card_id$q$),
('queue.empty_count', 'lib/review/queries.ts emptyQueue', 'authenticated', 'select', $q$
select count(*) from public.decision_cards where user_id = {uid}$q$),
('queue.next_due', 'lib/review/queries.ts emptyQueue', 'authenticated', 'select', $q$
select r.due_on, row_to_json(c) as card from public.reviews r
inner join lateral (select c.id from public.decision_cards c where c.id = r.card_id) c on true
where r.user_id = {uid} and r.mastered = false and r.due_on > current_date order by r.due_on limit 1$q$),
('defend.count', 'lib/defend/queries.ts defendableCount', 'authenticated', 'paged', $q$
select a.card_id, row_to_json(c) as card from public.answers a
inner join lateral (select c.id from public.decision_cards c where c.id = a.card_id) c on true
where a.user_id = {uid} and a.score = 2 order by a.id$q$),
('projects.repos', 'lib/projects/queries.ts (rpc learner_repos)', 'authenticated', 'select', $q$
select * from public.learner_repos()$q$),
-- Server reads and writes, with the service role.
('cron.profiles', 'api/cron/daily-review profiles', 'service_role', 'paged', $q$
select id, email, timezone, notify_email from public.profiles where notify_email = true order by id$q$),
('cron.reviews', 'api/cron/daily-review reviews (one 100-id chunk)', 'service_role', 'paged', $q$
select r.user_id, r.due_on, r.mastered, row_to_json(c) as card from public.reviews r
left join lateral (select c.decision, c.hidden from public.decision_cards c where c.id = r.card_id) c on true
where r.user_id = any({ids}) order by r.card_id$q$),
('cron.new_cards', 'api/cron/daily-review new cards (one 100-id chunk)', 'service_role', 'paged', $q$
select c.user_id, c.decision, c.created_at, r.reviews from public.decision_cards c
left join lateral (select json_build_object('card_id', r.card_id) as reviews from public.reviews r where r.card_id = c.id) r on true
where c.user_id = any({ids}) and c.hidden = false and c.created_at >= now() - interval '7 days' order by c.id$q$),
('cron.answers', 'api/cron/daily-review answers (one 100-id chunk)', 'service_role', 'paged', $q$
select user_id, created_at from public.answers where user_id = any({ids}) and created_at >= now() - interval '26 hours'
order by id$q$),
('cron.stuck_runs', 'lib/sessions/stuck.ts failStuckSessions', 'service_role', 'write', $q$
update public.sessions set status = 'failed', error = 'stuck' where status = 'processing'
and processing_started_at < now() - interval '10 minutes' returning id$q$),
('cron.stuck_uploads', 'lib/sessions/stuck.ts failStuckSessions', 'service_role', 'write', $q$
update public.sessions set status = 'failed', error = 'stuck' where status = 'pending'
and (processing_started_at < now() - interval '10 minutes'
  or (processing_started_at is null and created_at < now() - interval '10 minutes')) returning id$q$),
('roster.sessions', 'api/dashboard/v1/users sessions (one page of ids)', 'service_role', 'paged', $q$
select user_id, created_at from public.sessions where user_id = any({ids}) order by id$q$),
('roster.answers', 'api/dashboard/v1/users answers (one page of ids)', 'service_role', 'paged', $q$
select user_id, created_at from public.answers where user_id = any({ids}) order by id$q$),
('report.owned', 'lib/report/queries.ts getReport', 'service_role', 'paged', $q$
select r.card_id, r.updated_at, row_to_json(c) as card from public.reviews r
inner join lateral (
  select c.decision, c.evidence, c.files, c.hidden, c.flagged, row_to_json(s) as session from public.decision_cards c
  inner join lateral (select s.repo from public.sessions s where s.id = c.session_id and s.repo = any({shown_repos})) s on true
  where c.id = r.card_id and c.hidden = false and c.flagged = false
) c on true
where r.user_id = {uid} and r.mastered = true order by r.card_id$q$),
('account.sessions', 'api/account sessions raw_path', 'service_role', 'paged', $q$
select raw_path from public.sessions where user_id = {uid} order by id$q$),
('account.delete', 'api/account deleteUser (cascades from auth.users)', 'service_role', 'write', $q$
delete from auth.users where id = {uid}$q$);

-- 40 typical learners with at least one answered card, and the heavy one. ids is the 100-id chunk around the learner,
-- in id order as the cron reads it.
insert into lt_params
with heavy as (
  select p.id from public.profiles p order by (select count(*) from public.sessions s where s.user_id = p.id) desc limit 1
), typical as (
  select p.id from public.profiles p
  where p.id not in (select id from heavy) and exists (select 1 from public.reviews r where r.user_id = p.id)
  order by md5(p.id::text) limit 40
), picked as (
  select 'heavy' as persona, 0 as n, id from heavy
  union all select 'typical', (row_number() over (order by id))::int - 1, id from typical
), ranked as (
  select id, row_number() over (order by id) as rn from public.profiles
)
select k.persona, k.n, k.id,
  (select s.repo from public.sessions s where s.user_id = k.id and s.repo is not null limit 1),
  (select s.id from public.sessions s where s.user_id = k.id and s.status = 'ready'
    and exists (select 1 from public.decision_cards c where c.session_id = s.id) order by s.created_at desc limit 1),
  array(select s.id from public.sessions s where s.user_id = k.id and s.status = 'ready'
    order by s.created_at desc limit 20),
  (select report_slug from public.profiles where id = k.id),
  array(select r2.id from ranked r1 join ranked r2 on r2.rn > r1.rn - 50 and r2.rn <= r1.rn + 50 where r1.id = k.id),
  coalesce(nullif(array(select repo from public.projects where user_id = k.id and report_shown), '{}'), array['org/repo-1'])
from picked k;

-- Fills a query's placeholders from one lt_params row.
create function lt_fill(sql text, p lt_params) returns text language sql as $$
  select replace(replace(replace(replace(replace(replace(replace(sql,
    '{uid}', quote_literal(p.uid) || '::uuid'),
    '{repo}', quote_literal(coalesce(p.repo, ''))),
    '{session_id}', quote_literal(p.session_id) || '::uuid'),
    '{ready_ids}', quote_literal(p.ready_ids::text) || '::uuid[]'),
    '{slug}', quote_literal(p.slug)),
    '{ids}', quote_literal(p.ids::text) || '::uuid[]'),
    '{shown_repos}', quote_literal(p.shown_repos::text) || '::text[]')
$$;

-- Runs one statement as the query's role and the learner's JWT, returns EXPLAIN's JSON. A write is rolled back.
create function lt_explain(q lt_queries, p lt_params, stmt text, opts text) returns json language plpgsql as $$
declare
  plan json;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p.uid, 'role', q.role)::text, true);
  execute 'set local role ' || q.role;
  if q.kind = 'write' then
    begin
      execute 'explain (' || opts || ', format json) ' || stmt into plan;
      raise exception using errcode = 'P0001', message = 'lt_rollback';
    exception when sqlstate 'P0001' then
      null; -- the write is undone; plan keeps its value
    end;
  else
    execute 'explain (' || opts || ', format json) select count(*), coalesce(json_agg(t), ''[]'') from (' || stmt || ') t'
      into plan;
  end if;
  reset role;
  return plan;
end;
$$;

-- One sample: a select or write once, a paged query page by page until a short page. Times are planning + execution.
create function lt_sample(q lt_queries, p lt_params, opts text, out ms float8, out pages int, out rows bigint,
  out max_page_ms float8, out first_plan json) language plpgsql as $$
declare
  stmt text := lt_fill(q.sql, p);
  plan json;
  page_ms float8;
  page_rows bigint;
begin
  ms := 0; pages := 0; rows := 0; max_page_ms := 0;
  loop
    plan := lt_explain(q, p, case when q.kind = 'paged' then stmt || ' limit 1000 offset ' || rows else stmt end, opts);
    if first_plan is null then first_plan := plan; end if;
    page_ms := (plan -> 0 ->> 'Planning Time')::float8 + (plan -> 0 ->> 'Execution Time')::float8;
    -- a write returns its own rows; a select's are under the json_agg aggregate
    page_rows := case when q.kind = 'write' then (plan -> 0 -> 'Plan' ->> 'Actual Rows')::bigint
      -- the aggregate's outer child, not an InitPlan such as RLS's (select auth.uid())
      else (jsonb_path_query_first(plan::jsonb, '$[0].Plan.Plans[*] ? (@."Parent Relationship" == "Outer")."Actual Rows"'))::text::bigint end;
    ms := ms + page_ms; pages := pages + 1; rows := rows + page_rows;
    max_page_ms := greatest(max_page_ms, page_ms);
    exit when q.kind <> 'paged' or page_rows < 1000;
  end loop;
end;
$$;

-- Every query for both personas: warm-up samples, then up to max_samples, stopping early once budget_ms is spent
-- (never before min_samples, or before 5 once 10 x budget_ms is spent). One plan with buffers is kept per query and persona.
create procedure lt_run(tier int, phase text, max_samples int, min_samples int, budget_ms int, only_query text default null)
language plpgsql as $$
declare
  q lt_queries;
  who text;
  p lt_params;
  n_params int;
  s record;
  i int;
  started timestamptz;
begin
  for q in select * from lt_queries where only_query is null or name = only_query order by name loop
    foreach who in array array['typical', 'heavy'] loop
      select count(*) into n_params from lt_params where lt_params.persona = who;
      -- keep a plan with real buffers before timing; it also warms the cache
      select * into p from lt_params where lt_params.persona = who and n = 0;
      s := lt_sample(q, p, 'analyze, buffers');
      insert into lt_plans values (tier, phase, q.name, who, s.first_plan);
      commit;
      perform lt_sample(q, p, 'analyze, timing off');
      started := clock_timestamp();
      i := 0;
      loop
        select * into p from lt_params where lt_params.persona = who and n = i % n_params;
        s := lt_sample(q, p, 'analyze, timing off');
        insert into lt_results values (tier, phase, q.name, who, i, s.ms, s.pages, s.rows, s.max_page_ms);
        commit;
        i := i + 1;
        -- a query past the statement timeout can take minutes a sample: five are enough to show it
        exit when i >= max_samples
          or (i >= min_samples and extract(epoch from clock_timestamp() - started) * 1000 > budget_ms)
          or (i >= 5 and extract(epoch from clock_timestamp() - started) * 1000 > 10 * budget_ms);
      end loop;
      raise notice '% % %: n=% last=% ms', phase, q.name, who, i, round(s.ms::numeric, 2);
    end loop;
  end loop;
end;
$$;
