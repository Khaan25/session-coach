-- When the current processing run claimed the session, so a killed run can be found. created_at stays the upload time.
alter table public.sessions add column processing_started_at timestamptz;
update public.sessions set processing_started_at = created_at where status = 'processing';
create index sessions_processing_idx on public.sessions (processing_started_at) where status = 'processing';
