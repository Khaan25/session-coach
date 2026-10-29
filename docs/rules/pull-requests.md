# Pull requests

- **Branches:** `zia/<topic>` or `kasam/<topic>`, one task each. `main` is protected: PR required, all review conversations resolved, no force pushes, no direct pushes (admins included).
- **Before opening:** sync with `main`, then run the gates: `pnpm check:secrets`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- **Description:** What changed / Why / How to test (the template), plus the Vercel preview URL once it's ready.
- **Shared contracts:** a change to `packages/shared` or `supabase/migrations` says so at the top and tags the other person. Agree in the team channel first.
- **Bots:** cubic and CodeRabbit review every PR; Claude reviews too once `CLAUDE_CODE_OAUTH_TOKEN` is set. Fix valid comments in new commits. For a comment you won't fix, reply with the reason, then resolve the thread.
- **Merging:** squash merge, after CI is green and every thread is resolved. An agent merges only when a person explicitly tells it to merge that PR.
- **Drafts** skip the Claude review; mark the PR ready when it is.
