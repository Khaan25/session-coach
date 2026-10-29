# Commits

- **Format:** `type(scope): summary`, at most 72 characters, imperative ("add", not "added"). Types: `feat fix perf refactor style docs test build ci chore revert`. Scopes are listed in `scripts/check-commit-message.mjs`; a commit that spans areas takes no scope.
- **No co-author trailers.** Never add `Co-Authored-By:` to a commit; the commit-msg hook and CI reject it.
- **Body:** why the change was made, when the summary doesn't say it.
- **One logical change per commit.** Formatting-only changes go in their own commit.
- **Session logs** (`.claude-logs/`) go in their own commit: `docs(logs): session transcript`. Read and redact each log first (see [secrets.md](secrets.md)).
- **Enforced** by `.githooks/commit-msg` on every commit and by the `commits` CI job on every PR. Hooks install on `pnpm install` (`prepare` sets `core.hooksPath`).
- **Don't push to find out whether it compiles.** The pre-push hook runs format, typecheck, lint and tests; before making a PR reviewable, run the gates: `pnpm check:secrets`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
