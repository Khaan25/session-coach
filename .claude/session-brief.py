#!/usr/bin/env python3
"""SessionStart hook: prints the standing rules into context at the top of every session.

The rules live in AGENTS.md; this restates the few that must never be missed.
Keep it in step with AGENTS.md. It must never fail, so it always exits 0.
"""

BRIEF = """**Session Coach standing rules** (full list in AGENTS.md):

1. `main` is protected. Work on a branch (`zia/...`, `kasam/...`), open a PR, never push to main.
2. `packages/shared` and `supabase/migrations` are shared contracts. Change them only after the team agrees; every schema change is a new migration file.
3. Learners only read their own rows. Scores, cards, reviews and session deletes go through the server with the service role. Never write `decision_cards.flagged`/`hidden`; Postgres generates them.
4. The Play Stats API (`apps/web/src/app/api/dashboard/v1/`) follows docs/PLAY_API.md. Don't change its shape from memory.
5. Never read or print a real env file, by any tool. `.env.example` is fine.
6. Before a push: `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test` (the pre-push hook runs them)."""

try:
    print(BRIEF)
except Exception:
    pass
