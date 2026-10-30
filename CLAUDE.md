@AGENTS.md

Everything above applies to every coding agent in this repo, so it lives in `AGENTS.md`. Put new rules there, not here. This file holds only what is specific to Claude Code.

## Pull requests

An agent merges a PR only when a person explicitly tells it to merge that PR.

## Hooks

`.claude/settings.json` configures:

- **`SessionStart`** runs `.claude/session-brief.py`, which puts the standing rules into context.
- **`UserPromptSubmit`, `Stop`, `SubagentStop` and `SessionEnd`** run `.claude/log-session.py` (30 s timeout), which rewrites the session's log in `.claude-logs/` after every prompt, turn and subagent, so it is current without waiting for the session to close.
- **Denied reads** of real env files (`.env`, `.env.local`, `.env.*.local` and the per-environment names). `.env.example` stays readable. The deny list binds Claude Code's `Read` tool only, not the shell (`cat`, `grep`) or other tools: never read a real env file by any means.
- **Denied pushes:** only the listed forms: a plain push to `main`, `--force` and `-f`. Other forms, such as `--force-with-lease` or a `+refspec`, are not denied. Branch protection is the real guard.

## Session logs

`.claude-logs/` is tracked: the transcript of the session that produced a change ships on the branch with it. Commit it separately from the code, right before `git push`.

**Logs are committed.** Each holds the typed prompts, the reply each turn ended on, and each subagent's brief and report; tool calls, their output and injected context are left out. The script masks credential-shaped strings and email addresses as it writes. Before you stage `.claude-logs/`, still read each new log and redact what the script can't recognise:

- secrets (keys, tokens, passwords, connection strings);
- personal or private information: learner data, names or emails that aren't the authors', anything from a client.

The pre-commit hook scans transcripts for credential patterns only; it does not catch personal data. If a real secret scrolled past, redact it, never allowlist it. If you are unsure a log is safe, don't commit it. See [docs/rules/secrets.md](docs/rules/secrets.md).

`python3 .claude/log-session.py --backfill` writes logs for earlier sessions that have none.
