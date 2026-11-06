# Error handling

- **API routes:** validate input with zod at the boundary; return 400 with the field that failed. Catch unexpected errors, log them with the route name, return 500 with a generic message. Never return a stack trace or a database error to the client.
- **Route order:** authenticate first, then parse the body, then query. A bad body from an unknown caller gets 401, not 400, so the error never tells a stranger what the route expects. Helpers for this live in `apps/web/src/lib/api/http.ts`.
- **Not found means not found:** a 404 (or 422 "not in Storage yet") only when the lookup succeeded and found nothing. A Storage or database error is a 500, never a 4xx, so a server fault is never mistaken for a missing session (`sync` stops on a 5xx and tries again on a later start).
- **Pipeline:** a failed stage sets `sessions.status = 'failed'` and a learner-readable `error`. Retry the model call once on invalid output, then fail. Never leave a session in `processing`.
- **Stale sessions:** a worker that is killed can't mark its own session failed. The daily cron (`app/api/cron/daily-review/route.ts`) marks `sessions` stuck in `processing` for more than 10 minutes after their claim (`STUCK_MS` in `lib/sessions/stuck.ts`) as `failed`, with a retryable `error`. A re-push of a stuck session also retries it.
- **Crons:** one user's failure must not stop the batch. Claim each send first: insert the `email_log` row keyed by `(user_id, kind, sent_on)`; a unique conflict means skip. Then send, and record the provider id in `resend_id`. Log a failure and continue. A uniqueness check after sending can't stop a duplicate after a crash.
- **Optional data:** omit a field you can't answer instead of sending zero or a partial value (Play Stats API rule).
- **UI:** every data screen has loading, empty and error states. An error state says what happened and what to do next.
