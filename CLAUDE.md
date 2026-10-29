@AGENTS.md

Everything above applies to every coding agent in this repo, so it lives in `AGENTS.md`. Put new rules there, not here. This file holds only what is specific to Claude Code.

## Pull requests

An agent merges a PR only when a person explicitly tells it to merge that PR.

## Hooks

`.claude/settings.json` configures:

- **`SessionStart`** runs `.claude/session-brief.py`, which puts the standing rules into context.
- **`SessionEnd`** runs `.claude/log-session.py` (30 s timeout), which writes the session's transcript to `.claude-logs/`.
- **Denied reads** of real env files (`.env`, `.env.local`, `.env.*.local` and the per-environment names). `.env.example` stays readable. The deny list binds Claude Code's `Read` tool only, not the shell (`cat`, `grep`) or other tools: never read a real env file by any means.
- **Denied pushes:** only the listed forms: a plain push to `main`, `--force` and `-f`. Other forms, such as `--force-with-lease` or a `+refspec`, are not denied. Branch protection is the real guard.

## Session logs

`.claude-logs/` is tracked: the transcript of the session that produced a change ships on the branch with it. Commit it separately from the code, right before `git push`.

**Transcripts are written verbatim and committed.** Before you stage `.claude-logs/`, read each new log and redact:

- secrets (keys, tokens, passwords, connection strings);
- personal or private information: learner data, names or emails that aren't the authors', anything from a client.

The pre-commit hook scans transcripts for credential patterns only; it does not catch personal data. If a real secret scrolled past, redact it, never allowlist it. If you are unsure a log is safe, don't commit it. See [docs/rules/secrets.md](docs/rules/secrets.md).

The current session's log is written only when the session ends, so it lands in the next push. `python3 .claude/log-session.py --backfill` writes earlier sessions.
