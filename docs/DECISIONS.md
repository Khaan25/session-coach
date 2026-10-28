# Decisions

Newest first. Each entry: what we decided, why, and what we rejected.

## 2026-10-28 · `flagged` and `hidden` on decision cards

- **Decision:** `flagged = true` when any evidence item has `verified: false`. `hidden = true` when no evidence item is verified; the row is kept and learners never see it.
- **Why:** hiding an unproven card protects learners from studying an invented reason. Keeping the row lets the accuracy check count every card (design doc, stage 4 rule 5).
- **Rejected:** deleting unverified cards (breaks the accuracy numbers); flagging only downgraded stated cards (misses inferred cards with a bad quote).
- Both values come from `getEvidenceFlags()` in `packages/shared/src/decision.ts`. Pending Kasam's confirmation.

## 2026-10-28 · Learners only read; the server writes

- **Decision:** RLS gives learners `select` on their own rows. Answers, scores, reviews and cards are written by the server with the service role key.
- **Why:** a learner who can write `answers.score` or `reviews.mastered` can fake progress.

## 2026-10-28 · pnpm monorepo, Tailwind v4, shadcn/ui, `@shadcn/lint`

- **Decision:** pnpm workspaces with `apps/web`, `packages/shared`, `packages/cli`. Tailwind v4 + shadcn/ui, with `@shadcn/lint` enforcing design-system rules.
- **Why:** both halves import one Decision schema. The lint rules give the agent a concrete fix when it restyles a component, which keeps the UI consistent across two people and their agents.

## 2026-10-28 · `main` protected

- **Decision:** pull request required, 1 approving review, stale approvals dismissed, conversations resolved, no force pushes, no deletion, admins included.
- **Why:** two people and two agents on one repo; every change gets a second pair of eyes.
