# Migrations

- **Every schema change is a new file** in `supabase/migrations/` named `YYYYMMDDHHMMSS_what_changes.sql`. A migration is read-only once it is merged to `main`; change it with a new file.
- **Shared contract:** agree in the team channel first; update `packages/shared` in the same PR so types and columns match.
- **RLS on every new table**, with the narrowest policy that works. Learners read their own rows; the server writes with the service role. Prefer column grants over trusting the client (see `decision_cards.model_answer`).
- **Integrity in the database:** ownership through composite foreign keys, derived values as generated columns, invariants as `check` constraints.
- **Test before pushing:** apply to a scratch Postgres or the local stack (`supabase start`, `supabase db reset`) and try one insert that should fail for each new rule.
- **Applying to live:** `supabase db push` against the linked project, after the PR merges. The live project is `session-coach` (ref `cbmoddlxyrokahfodrme`, ap-south-1).
