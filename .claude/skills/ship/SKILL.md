---
name: ship
description: Land finished work the standard way - run local-review, commit in Conventional Commits, push the branch, open the PR and watch CI to green. Use for "ship it", "push this up", "ready to ship?", "push to main" or "merge to main". Every one of them ends in a branch and a PR with green CI, never a push to main; merge only when the person explicitly says to merge that PR.
argument-hint: "[optional: 'check' to run the gates without committing]"
---

# Ship

1. **Branch.** On `main`? Create `zia/<topic>` or `kasam/<topic>` first. Never push to `main`.
2. **Gates.** Run the `local-review` skill. With the `check` argument, stop here and report.
3. **Commit.** Stage only the files of this change (never `git add -A` with a real env file around). Message: `type(scope): summary` per docs/rules/commits.md, body says why. One logical change per commit.
4. **Session logs.** Stage `.claude-logs/` as its own commit: `docs(logs): session transcript`.
5. **Push.** `git push -u origin <branch>`. The pre-push hook runs the gates again; don't use `--no-verify`.
6. **PR.** `gh pr create` with the template (What changed / Why / How to test). Add the Vercel preview URL once its deployment is ready. Shared contract changes: say so at the top and tag the other person.
7. **CI and bots.** Wait for CI, cubic and CodeRabbit. Fix valid comments in new commits; reply with the reason and resolve the ones you skip.
8. **Stop.** Report the PR link, CI state and open threads. Merge only when the person says to merge this PR.
