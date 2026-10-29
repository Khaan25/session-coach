---
name: local-review
description: Run the same gates CI runs, then a manual pass against AGENTS.md and docs/rules, before a push. Use for "/local-review", "review this before I push", "is this ready", or when a change is finished and should be checked locally before CI sees it.
---

# Local review

A pre-push gate: CI's checks, run locally, plus the rules CI can't check. Every push to an open PR is a CI run and a round of bot reviews, so catch problems here.

## 1. Gates (same list as `.github/workflows/ci.yml`)

Run from the repo root, in order. Stop at the first failure, fix it, rerun from that gate.

```bash
pnpm check:secrets
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
node scripts/check-commit-message.mjs --range origin/main..HEAD
```

If a migration changed, also apply it to a scratch Postgres (or `supabase db reset` on the local stack) and try one insert that should fail for each new constraint or policy.

## 2. Manual pass

Read the diff (`git diff origin/main...HEAD`) against:

- `AGENTS.md` rules, and each `docs/rules/*.md` the diff touches.
- Shared contracts: does it change `packages/shared` or `supabase/migrations`? Was that agreed in the team channel?
- RLS: any new table has RLS on and a policy; learners never get write access to scores, cards or flags.
- Secrets: no service-role key or model key reachable from a client component.
- UI: shadcn components restyled only through variants; `pnpm lint` passing is not enough if a new `ui/` variant duplicates an existing one.
- Play Stats API: shape unchanged unless docs/PLAY_API.md changed with it.

## 3. Report

One line per gate (pass/fail), then each manual finding with `file:line` and the fix. Say what you didn't check.
