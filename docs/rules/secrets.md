# Secrets

- **Where they live:** `apps/web/.env.local` on your machine, Vercel environment variables for deployments. Only `.env.example` is committed, with empty values.
- **Never read, print or paste a real env file** by any means: not the Read tool, not `cat`, `grep`, `head` or `source`. `.claude/settings.json` denies Claude Code's `Read` tool on those files, nothing more; the shell and every other tool are on you.
- **Server only:** `SUPABASE_SERVICE_ROLE_KEY`, model keys, `RESEND_API_KEY`, `CRON_SECRET`, `DASHBOARD_API_KEY`. Never import them into a client component; only `NEXT_PUBLIC_*` values reach the browser.
- **Session transcripts** in `.claude-logs/` are committed. `.claude/log-session.py` masks credential-shaped strings and emails as it writes them, as a safety net. The pre-commit hook and CI scan them like any file. If a real value scrolled past, redact it in the transcript; never allowlist a real secret. The scanner catches credential patterns only, not personal data: before staging a log, read it and redact personal or private information too (learner data, names or emails that aren't the authors', anything from a client). If unsure, don't commit that log.
- **False positives:** add `allowlist secret` in a comment on the line, or a glob to `.secretsallow`.
- **Leaked key:** rotate it first (Supabase dashboard, provider console), then remove it from the code. Git history keeps the old value.
- **DB password:** in your password manager or keychain, never in the repo or an env file the app reads.
