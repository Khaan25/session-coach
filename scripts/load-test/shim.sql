-- The parts of a Supabase database that supabase/migrations reference, for a plain Postgres cluster: the API roles,
-- auth.users and auth.uid(), the storage bucket table and the realtime publication. auth.uid() is Supabase's own
-- definition, so RLS policies read the learner from request.jwt.claims exactly as they do behind PostgREST.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false);

create publication supabase_realtime;

-- Supabase's default grants: the API roles may use everything in public unless a migration revokes it.
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant all on auth.users to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
