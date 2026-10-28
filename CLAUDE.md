# Session Coach

pnpm monorepo: `apps/web` (Next.js 16 App Router), `packages/shared` (Decision + Session zod schemas), `packages/cli` (hook, worker), `supabase/migrations`.

## Commands

- `pnpm typecheck` and `pnpm lint` after every change; fix all errors before saying you're done
- `pnpm --filter @session-coach/shared test` after touching `packages/shared`
- `pnpm dev` runs the web app on :3000

## Rules

- Next.js 16 differs from training data. Read `apps/web/AGENTS.md` and `apps/web/node_modules/next/dist/docs/` before writing Next.js code.
- UI uses shadcn/ui components in `apps/web/src/components/ui`. Don't restyle them with `className`; add a variant in the component file instead. `@shadcn/lint` enforces this, so read its error, it says what to use.
- Theme tokens only: no raw colors (`bg-pink-500`), no arbitrary values (`p-[13px]`), no inline styles.
- No barrel files. Import from the file that defines the symbol. `packages/shared` exposes one entry per file in its `exports`.
- Model names live in env vars, read through `callModel(task, input)`. Never hard-code a model or provider.
- `packages/shared` and `supabase/migrations` are shared contracts: change them only after the team agrees, then in one place.
- Every schema change is a new migration file. Never edit a merged migration.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, model keys) never reach client components.

## Gotchas

- `main` is protected. Work on a branch (`zia/…`, `kasam/…`) and open a PR; direct pushes fail.
- Learners can only read their own rows (RLS). Scores, cards and schedules are written by the server with the service role.
- `decision_cards.hidden = true` rows are invisible to learners by policy; query them only with the service role.
- Log your reasoning for real choices in `docs/DECISIONS.md`.
