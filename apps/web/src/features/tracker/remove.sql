-- Removes the tracker (see README.md). Copy into a new migration; never edit 20261101000000_tracker.sql.
drop table if exists public.tracker_tasks;
drop function if exists public.tracker_tasks_done_by();
drop table if exists public.tracker_members;
drop function if exists public.is_tracker_member();
