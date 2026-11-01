-- Tracker members can edit a task's title and details in place (double-click on /tracker), not only tick it, and add
-- tasks to an existing section.
-- done_by moves to a trigger: an edit to a task the other member ticked keeps their name, and nobody can write a tick
-- in someone else's name.

-- Runs as the caller (no security definer): it only reads auth.uid() and the row being updated.
create function public.tracker_tasks_done_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Unticked always means no done_by, even on a row an older policy left with one.
  if new.done_at is null then
    new.done_by := null;
  elsif new.done_at is distinct from old.done_at then
    new.done_by := (select auth.uid());
  else
    new.done_by := old.done_by;
  end if;
  return new;
end;
$$;

create trigger tracker_tasks_done_by
  before update on public.tracker_tasks
  for each row execute function public.tracker_tasks_done_by();

-- The trigger owns done_by now, so the policy no longer checks it.
drop policy "members tick tasks" on public.tracker_tasks;
create policy "members edit tasks" on public.tracker_tasks for update to authenticated
  using ((select public.is_tracker_member())) with check ((select public.is_tracker_member()));

revoke update on public.tracker_tasks from anon, authenticated;
grant update (done_at, title, details) on public.tracker_tasks to authenticated;

-- Adding a task: members insert the section, position and title only, so a new task starts unticked with no notes and
-- no owner, and done_by stays the trigger's.
create policy "members add tasks" on public.tracker_tasks for insert to authenticated
  with check ((select public.is_tracker_member()));
revoke insert on public.tracker_tasks from anon, authenticated;
grant insert (section, position, title) on public.tracker_tasks to authenticated;

-- An emptied details box saves null, never blank text. \S, not btrim(), so newlines and tabs alone count as blank too.
alter table public.tracker_tasks
  add constraint tracker_tasks_details_not_blank check (details is null or details ~ '\S');
