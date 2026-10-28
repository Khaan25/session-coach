# Session Coach

Turns each Claude Code session into 3–5 evidence-backed decision cards, then tests you on the why on day 1, 3 and 7 until you can explain the code your agent wrote.

Built by Kasam Thapa Magar and Zia Ur Rehman Khan for the 8x Playmakers trial (cohort C2, Coding theme), 28 Oct – 6 Nov 2026.

## How it works

1. A Claude Code session ends. The `SessionEnd` hook starts a detached worker and exits, so Claude Code never waits.
2. The worker redacts secrets, gzips the log and uploads it (or `session-coach push --latest`).
3. The server filters the log, numbers the events (E1, E2, …) and one model call extracts 3–5 decisions.
4. Plain code checks every quote exists in the cited event. Cards with no verified quote are hidden.
5. The learner explains each decision in their own words. A model grades it 0 / 1 / 2.
6. The question returns on day 1, 3 and 7. A daily email brings the learner back.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repo layout

| Path | What | Owner |
|---|---|---|
| `apps/web` | Next.js app: pages, API routes, pipeline | both |
| `packages/cli` | `init`, `login`, `push`, hook, worker | Kasam |
| `packages/shared` | Decision and Session types + zod schemas, sample fixture | shared, change after agreement |
| `supabase/migrations` | every schema change as a migration file | shared, change after agreement |
| `docs/` | architecture and team decisions | both |

## Run it locally

Needs Node 22+. pnpm comes from Corepack, pinned in `package.json`.

```bash
corepack enable pnpm
pnpm install
cp .env.example apps/web/.env.local   # fill in values
pnpm dev                              # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | start the web app |
| `pnpm typecheck` | TypeScript in every package |
| `pnpm lint` | ESLint + `@shadcn/lint` design-system rules |
| `pnpm --filter @session-coach/shared test` | schema and fixture tests |
| `pnpm build` | production build |

## Agreed before the repo

| Topic | Decision |
|---|---|
| Track | Coding, saved on the 8x dashboard (theme locked) |
| Stack | Next.js 16 + TypeScript (strict), Tailwind v4, shadcn/ui, Supabase, Vercel |
| Package manager | pnpm |
| AI | `callModel(task, input)`; provider and model names only in env vars. Plan: Gemini free tier, OpenRouter then Groq as fallback |
| Secrets | `.env.example` committed, real keys never. Service-role key only on the server |
| Daily sync | Written standup in the team channel. Kasam NPT (UTC+5:45), Zia PKT (UTC+5) |
| Definition of done | works on a real session, typecheck + lint pass, reviewed by the other person, merged, demo-able |

## Working together

- `main` is protected: pull request required, 1 approving review, no force pushes, no direct pushes (admins included).
- One small branch per task: `kasam/parser`, `zia/review-screen`.
- Before the PR: sync `main`, run `pnpm typecheck && pnpm lint`, test on a real session.
- PR says what changed, why, and how to test it. The other person reviews within a few hours.
- Shared types and migrations change only after a message in the team channel.
- Team decisions go in [docs/DECISIONS.md](docs/DECISIONS.md) with a date and a reason.
