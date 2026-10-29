# Error handling

- **API routes:** validate input with zod at the boundary; return 400 with the field that failed. Catch unexpected errors, log them with the route name, return 500 with a generic message. Never return a stack trace or a database error to the client.
- **Pipeline:** a failed stage sets `sessions.status = 'failed'` and a learner-readable `error`. Retry the model call once on invalid output, then fail. Never leave a session in `processing`.
- **Crons:** one user's failure must not stop the batch. Log it and continue; `email_log` uniqueness makes a rerun safe.
- **Optional data:** omit a field you can't answer instead of sending zero or a partial value (Play Stats API rule).
- **UI:** every data screen has loading, empty and error states. An error state says what happened and what to do next.
