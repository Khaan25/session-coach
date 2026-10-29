@AGENTS.md

Everything above applies to every coding agent in this repo, so it lives in `AGENTS.md`. Put new rules there, not here. This file holds only what is specific to Claude Code.

## Skills in this repo

Committed under `.claude/skills/`, so every clone gets them:

| Skill          | Use it for                                                             |
| -------------- | ---------------------------------------------------------------------- |
| `spec`         | Research a change, write requirements + a phased plan in `docs/plans/` |
| `local-review` | Before every push: CI's exact gates, then a pass against the rules     |
| `ship`         | Gates, a Conventional commit, the branch pushed, a PR, green CI        |

`ship` never pushes to `main` and never merges on its own. An agent merges a PR only when a person explicitly tells it to merge that PR.

## Hooks

`.claude/settings.json` configures:

- **`SessionStart`** runs `.claude/session-brief.py`, which puts the standing rules into context.
- **`SessionEnd`** runs `.claude/log-session.py`, which writes the session's transcript to `.claude-logs/`.
- **Denied reads** of real env files (`.env`, `.env.local`, `.env.*.local` and the per-environment names). `.env.example` stays readable. The deny list binds Claude Code's file tools only, not a shell `cat` or `grep`: never read a real env file by any means.
- **Denied pushes** to `main` and force pushes. Branch protection is the real guard.

## Session logs

`.claude-logs/` is tracked: the transcript of the session that produced a change ships on the branch with it. Commit it separately from the code, right before `git push`. The pre-commit hook scans transcripts for secrets like any other file; if a real value scrolled past, redact it in the transcript, never allowlist it. `python3 .claude/log-session.py --backfill` writes older sessions.
