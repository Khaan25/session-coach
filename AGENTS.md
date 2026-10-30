# Session Coach

pnpm monorepo: `apps/web` (Next.js 16 App Router), `packages/shared` (Decision + Session zod schemas), `packages/cli` (empty stub; hook and worker planned), `supabase/migrations`.

## Commands

- `pnpm typecheck` and `pnpm lint` (oxlint) after every change; fix all errors before saying you're done
- `pnpm format` (oxfmt) before committing; `pnpm format:check` runs in the pre-push hook and CI
- `pnpm check:secrets` scans tracked files for credentials (the pre-commit hook scans staged ones)
- `pnpm test` runs every package's tests; `pnpm --filter @session-coach/shared test` after touching `packages/shared`
- `pnpm dev` runs the web app on :3000

## Rules

- Next.js 16 differs from training data. Read `apps/web/AGENTS.md` and `apps/web/node_modules/next/dist/docs/` before writing Next.js code.
- UI uses shadcn/ui components (Base UI primitives, not Radix) in `apps/web/src/components/ui`. Don't restyle them with `className`; add a variant in the component file instead. `@shadcn/lint` (an oxlint JS plugin, configured in `apps/web/.oxlintrc.json`) enforces this, so read its error, it says what to use.
- Theme tokens only: no raw colors (`bg-pink-500`), no arbitrary values (`p-[13px]`) outside `src/components/ui/`, no inline styles.
- No barrel files. Import from the file that defines the symbol. `packages/shared` exposes one entry per file in its `exports`.
- Model names live in env vars, read through `callModel(task, input)`. Never hard-code a model or provider.
- `packages/shared` and `supabase/migrations` are shared contracts: change them only after the team agrees, then in one place.
- Every schema change is a new migration file. Never edit a merged migration.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, model keys) never reach client components.

- Commits follow Conventional Commits: `type(scope): summary`. Scopes are listed in `scripts/check-commit-message.mjs`. See [docs/rules/commits.md](docs/rules/commits.md).
- The Play Stats API in `apps/web/src/app/api/dashboard/v1/` follows [docs/PLAY_API.md](docs/PLAY_API.md). Get the current contract from the stats dashboard before changing its shape; never change it from memory.
- Never read, print or paste a real env file by any means, including shell `cat` or `grep`. See [docs/rules/secrets.md](docs/rules/secrets.md).

## Rule files

- [docs/rules/commits.md](docs/rules/commits.md): commit messages and what goes in one commit
- [docs/rules/pull-requests.md](docs/rules/pull-requests.md): branches, PRs, review bots, merging
- [docs/rules/secrets.md](docs/rules/secrets.md): env files, keys, session transcripts
- [docs/rules/migrations.md](docs/rules/migrations.md): schema changes and the live database
- [docs/rules/authorization.md](docs/rules/authorization.md): RLS, service role, API route guards
- [docs/rules/error-handling.md](docs/rules/error-handling.md): failures in routes, the pipeline and crons
- [docs/rules/components.md](docs/rules/components.md): how app components compose (children, slots, compound parts, hooks) and why

## Gotchas

- `main` is protected. Work on a branch (`zia/…`, `kasam/…`) and open a PR; direct pushes fail.
- Learners can only read their own rows (RLS). Scores, cards and schedules are written by the server with the service role.
- `decision_cards.hidden = true` rows are invisible to learners by policy; query them only with the service role.
- `decision_cards.flagged` and `hidden` are generated from `evidence` by Postgres. Never write them.
- Learners can't read `decision_cards.model_answer` (the answer key). Select card columns by name; `select *` fails with the anon key.
- Log your reasoning for real choices in `docs/DECISIONS.md`.
