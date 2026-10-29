-- Provider-neutral profiles: Google, email+password, and GitHub sign-ups all fill the same fields.
-- display_name and avatar_url replace github_login. Linked logins live in auth.identities
-- (server reads identity_data ->> 'user_name' for a GitHub handle); no copy here.
-- email stays copied so RLS reads and the Play Stats roster don't need auth.users; a trigger
-- keeps it in sync when the address changes.

/* Adds the provider-neutral name and avatar columns to profiles */
alter table public.profiles
  /* Name shown in the app; trimmed and 1 to 100 characters so it never renders blank or overflows */
  add column display_name text check (
    display_name is null or (display_name = btrim(display_name) and char_length(display_name) between 1 and 100)
  ),
  /* Profile picture from the sign-in provider; https only so the page never loads mixed content */
  add column avatar_url text check (avatar_url is null or avatar_url like 'https://%');

-- Backfill existing GitHub users before dropping the old column.
/* Fills display_name, avatar_url and email for learners who signed up before this migration */
update public.profiles p
/* Uses the first non-blank of full name, name, then the old GitHub handle, cut to 100 characters */
set display_name = btrim(left(coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(p.github_login), '')), 100)),
    /* Keeps the provider avatar only when it is an https link; otherwise leaves it empty */
    avatar_url = case when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') like 'https://%'
      then coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') end,
    /* Refreshes the copied email from auth.users */
    email = u.email
/* Matches each profile to its auth user by id */
from auth.users u
where u.id = p.id;

/* Removes the GitHub-only column now that display_name replaces it */
alter table public.profiles drop column github_login;

-- Creates the profile row on sign-up. Every field is optional, so missing metadata never blocks sign-up.
-- Google: full_name/name, avatar_url/picture. GitHub: name, user_name, avatar_url. Email: whatever signUp() sent in options.data.
/* Replaces the sign-up trigger function so it fills the new columns for any provider.
 * security definer lets it write public.profiles; the empty search_path blocks hijacking. */
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  /* Provider metadata, or an empty object so the lookups below return null instead of failing */
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  /* Google sends the avatar as picture, GitHub as avatar_url */
  avatar text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
begin
  /* Creates the profile with the learner's id, email, best available name and avatar */
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    /* First non-blank of full name, name, then GitHub handle, cut to 100 characters */
    btrim(left(coalesce(
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(btrim(meta ->> 'name'), ''),
      nullif(btrim(meta ->> 'user_name'), '')), 100)),
    /* Avatar only when it is an https link */
    case when avatar like 'https://%' then avatar end
  )
  /* A profile that already exists is left alone, so a repeated insert never fails sign-up */
  on conflict (id) do nothing;
  /* Returns the row so the sign-up proceeds */
  return new;
end;
$$;

-- Keeps profiles.email equal to auth.users.email. With secure email change on, Supabase updates
-- auth.users.email only after the new address is confirmed, so this fires once, at the right time.
/* Copies a confirmed email change from auth.users into the learner's profile.
 * security definer lets it write public.profiles from the auth schema's update. */
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  /* Overwrites the profile's email with the new address */
  update public.profiles set email = new.email where id = new.id;
  /* Returns the row so the auth update proceeds */
  return new;
end;
$$;

/* Runs the sync above only when the email really changed, once per updated user */
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Learners may also rename themselves. avatar_url and email stay server/trigger-managed.
/* Adds display_name to the columns a learner may edit */
grant update (display_name) on public.profiles to authenticated;
