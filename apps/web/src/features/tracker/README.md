# Tracker

The team's build to-do list at `/tracker`, used in place of a project management tool during the 8x trial. Only
tracker members (Zia and Kasam) can open it; for everyone else it's a 404. Nothing else in the app imports from this
folder, so it can be removed without touching learner features.

## What's here

| File               | What it does                                                                     |
| ------------------ | -------------------------------------------------------------------------------- |
| `tracker-page.tsx` | The page: header, Suspense, 404 for non-members                                  |
| `task-list.tsx`    | Sections, progress bar, owner tags, tick boxes, expandable details, copy buttons |
| `markdown.tsx`     | Renders task details (GitHub-flavoured Markdown, tables)                         |
| `context.ts`       | The "Project context" panel text, from the build guide                           |
| `queries.ts`       | `getTrackerTasks()`: member check, then tasks in order (RLS client)              |
| `actions.ts`       | `setTaskDone()`: tick or untick one task                                         |
| `remove.sql`       | Drops the tracker's tables and function                                          |

## Outside this folder

| Where                                            | What                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `apps/web/src/app/(app)/tracker/page.tsx`        | Two-line file that mounts this page at `/tracker`                                 |
| `apps/web/src/lib/supabase/proxy.ts`             | `"/tracker"` in `PROTECTED`, so signed-out visitors log in                        |
| `supabase/migrations/20261101000000_tracker.sql` | `tracker_members`, `tracker_tasks`, `is_tracker_member()`, RLS and the seed tasks |
| `apps/web/package.json`                          | `react-markdown` and `remark-gfm`, used only here                                 |
| `docs/DATA_MODEL.md`                             | The `tracker_members` and `tracker_tasks` section                                 |

## Add a member

Zia and Kasam are added by the migration, but only if their profiles exist when it runs. After applying it, check:

```sql
select p.email from public.tracker_members m join public.profiles p on p.id = m.user_id;
```

It should list both. Anyone missing (or anyone else), in the Supabase SQL editor:

```sql
insert into public.tracker_members (user_id) select id from public.profiles where email = '<email>';
```

Tasks are added and edited in the SQL editor too; the page only ticks and unticks.

## Remove the tracker

1. Copy `remove.sql` into a new migration (`supabase migration new remove_tracker`). Don't delete
   `20261101000000_tracker.sql`: it has already run in production.
2. Delete this folder and `apps/web/src/app/(app)/tracker/`.
3. Remove `"/tracker"` from `PROTECTED` in `apps/web/src/lib/supabase/proxy.ts`, and the tracker section from
   `docs/DATA_MODEL.md`.
4. `pnpm --filter web remove react-markdown remark-gfm`
5. `pnpm typecheck && pnpm lint && pnpm test`
