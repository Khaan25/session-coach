# Commits

- **Format:** `type(scope): summary`, at most 72 characters, imperative ("add", not "added"). Types: `feat fix perf refactor style docs test build ci chore revert`. Scopes are listed in `scripts/check-commit-message.mjs`; a commit that spans areas takes no scope.
- **No co-author trailers.** Never add `Co-Authored-By:` to a commit; the commit-msg hook and CI reject it.
- **No co-author trailers.** Never add `Co-Authored-By:` to a commit; the commit-msg hook and CI reject it.
- **Body:** why the change was made, when the summary doesn't say it.
- **One logical change per commit.** Formatting-only changes go in their own commit.
- **Session logs** (`.claude-logs/`) go in their own commit: `docs(logs): session transcript`.
- **Enforced** by `.githooks/commit-msg` on every commit and by the `commits` CI job on every PR. Hooks install on `pnpm install` (`prepare` sets `core.hooksPath`).
- **Don't push to find out whether it compiles.** The pre-push hook runs format, typecheck, lint and tests; run the `local-review` skill before making a PR reviewable.
