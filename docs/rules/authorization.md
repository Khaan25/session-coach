# Authorization

- **Learner data:** Supabase RLS. A learner reads only their own rows; `decision_cards` hides `hidden` rows and the `model_answer` column. Select card columns by name.
- **Server writes:** API routes and the pipeline use the service-role client from `apps/web/src/lib/supabase/admin.ts`, server only. Check the caller before every write: a learner's session for app routes, a CLI token hash for uploads.
- **Play Stats API** (`/api/dashboard/v1/*`): `requireDashboardKey()`, a bearer token compared in constant time. Unset `DASHBOARD_API_KEY` means 503: closed, not open.
- **Crons:** check `Authorization: Bearer $CRON_SECRET` before doing anything.
- **Decide in code, before the query.** Never rely on a query returning nothing as the access check.
