-- Device-code login for the CLI (OAuth 2.0 Device Authorization Grant, RFC 8628). `session-coach login` asks for a
-- code, the learner approves it on /cli/approve, and the polling CLI receives a new cli_tokens row once.
-- Server only: written and read with the service role. RLS is on with no learner policies.
create table public.cli_device_codes (
  id uuid primary key default gen_random_uuid(),
  -- sha256 hex of the device code the CLI polls with; the raw code is never stored.
  device_code_hash text not null unique check (device_code_hash ~ '^[0-9a-f]{64}$'),
  -- What the learner types: 8 letters from an alphabet without vowels or look-alikes, shown as XXXX-XXXX. Unique for
  -- every stored row (stronger than "among unexpired"); expired rows are deleted, and a clash retries the insert.
  user_code text not null unique check (user_code ~ '^[BCDFGHJKLMNPQRSTVWXZ]{8}$'),
  -- The label the CLI sends (hostname and OS). Becomes cli_tokens.label.
  client_name text not null check (char_length(client_name) between 1 and 100),
  requested_ip text check (char_length(requested_ip) <= 64),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  -- Seconds the CLI must wait between polls; slow_down adds 5 (RFC 8628 section 3.5).
  poll_interval integer not null default 5 check (poll_interval between 5 and 60),
  approved_by uuid references public.profiles (id) on delete cascade,
  approved_at timestamptz,
  denied_at timestamptz,
  token_issued_at timestamptz,
  last_polled_at timestamptz,
  check (expires_at > requested_at and expires_at <= requested_at + interval '10 minutes'),
  -- Approved means both who and when.
  check ((approved_by is null) = (approved_at is null)),
  -- A code is approved or denied, never both.
  check (approved_at is null or denied_at is null),
  -- A token is issued only for an approved code.
  check (token_issued_at is null or approved_at is not null)
);

-- The create route deletes expired rows on each call.
create index cli_device_codes_expires_idx on public.cli_device_codes (expires_at);

alter table public.cli_device_codes enable row level security;
-- No policies: learners never read or write this table. The grants go too, so a missing policy isn't the only guard.
revoke all on public.cli_device_codes from anon, authenticated;
