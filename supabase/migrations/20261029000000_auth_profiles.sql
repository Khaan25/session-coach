-- Provider-neutral profiles: Google, email+password, and GitHub sign-ups all fill the same fields.
-- display_name and avatar_url replace github_login. Linked logins live in auth.identities
-- (server reads identity_data ->> 'user_name' for a GitHub handle); no copy here.
-- email stays copied so RLS reads and the Play Stats roster don't need auth.users; a trigger
-- keeps it in sync when the address changes.

alter table public.profiles
  add column display_name text check (
    display_name is null or (display_name = btrim(display_name) and char_length(display_name) between 1 and 100)
  ),
  add column avatar_url text check (avatar_url is null or avatar_url like 'https://%');

-- Backfill existing GitHub users before dropping the old column.
update public.profiles p
set display_name = btrim(left(coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(p.github_login), '')), 100)),
    avatar_url = case when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') like 'https://%'
      then coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') end,
    email = u.email
from auth.users u
where u.id = p.id;

alter table public.profiles drop column github_login;

-- Creates the profile row on sign-up. Every field is optional, so missing metadata never blocks sign-up.
-- Google: full_name/name, avatar_url/picture. GitHub: name, user_name, avatar_url. Email: whatever signUp() sent in options.data.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  avatar text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    btrim(left(coalesce(
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(btrim(meta ->> 'name'), ''),
      nullif(btrim(meta ->> 'user_name'), '')), 100)),
    case when avatar like 'https://%' then avatar end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Keeps profiles.email equal to auth.users.email. With secure email change on, Supabase updates
-- auth.users.email only after the new address is confirmed, so this fires once, at the right time.
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Learners may also rename themselves. avatar_url and email stay server/trigger-managed.
grant update (display_name) on public.profiles to authenticated;
