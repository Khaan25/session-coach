# Claude build logs

This folder fills itself. At the **end of every Claude Code session**, the
`SessionEnd` hook in [`.claude/settings.json`](../.claude/settings.json) runs
[`.claude/log-session.py`](../.claude/log-session.py), which reads the session
transcript and drops a timestamped markdown summary here, e.g.
`2026-06-22_15-32-29_a87.md`.

You do two things:

1. **Approve the hook once.** The first time you open Claude Code in this repo it
   asks you to trust the project hook. Approve it, and from then on it writes a
   log at the end of every session. The current session's log is written only
   when the session ends, so it lands in your next push.
2. **Review each new log, then commit it** in its own commit, right before
   `git push`. The log ships on the branch next to the change it describes.

## Before you commit a log

Transcripts are written verbatim. Read each new log and redact:

- secrets (keys, tokens, passwords, connection strings);
- personal or private information: learner data, names or emails that aren't
  the authors', anything from a client.

The secret scanner catches credential patterns only, not personal data. If you
are unsure a log is safe, don't commit it. See
[docs/rules/secrets.md](../docs/rules/secrets.md).

## Author attribution

Each log is stamped with an author, resolved in this order:

1. the `CLAUDE_LOG_AUTHOR` environment variable, if set;
2. your repo's `git config user.name`;
3. `unknown`.

Set your git `user.name` (which you should anyway) and your logs are attributed
automatically — nothing to edit.

## Backfilling

To write logs for earlier sessions that don't have one yet:

```bash
python3 .claude/log-session.py --backfill          # skips sessions already logged
python3 .claude/log-session.py --backfill --force  # regenerates all
```
