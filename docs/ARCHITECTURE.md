# Architecture

```
laptop                         server (Vercel + Supabase)                     learner
──────                         ──────────────────────────                     ───────
Claude Code session ends
  └─ SessionEnd hook (~50ms)
       └─ detached worker ──POST gzip──► /api/sessions ─► Storage + sessions(pending)
          redact, retry,                     └─ after(): filter → timeline → extract → evidence check
          outbox if offline                         └─ decision_cards, sessions(ready) ──Realtime──► dashboard
                                                                                          review: explain back
                                                                     grade 0/1/2 ◄──────── answer
                                                                     reviews(day 1/3/7)
                                              daily cron ──email──────────────────────────► back to review
```

## Why a detached worker

`SessionEnd` hooks run inside a short time budget and can be killed mid-upload. The hook reads `session_id` and `transcript_path` from stdin, spawns the worker with `detached: true` + `unref()`, and exits. The worker does the slow work: redact, gzip, upload with 3 retries, and on failure saves to `~/.session-coach/outbox/`. It skips sessions already in `~/.session-coach/sent`; the server returns 409 for repeats.

## Pipeline stages (Kasam)

1. **Filter + store:** keep prompts, agent text, Write/Edit summaries, Bash commands; drop thinking blocks and attachments; redact again.
2. **Timeline:** number kept events E1, E2, … with a map back to the raw JSONL line.
3. **Extract:** one model call returns 3–5 decisions as JSON validated by `decisionCardSchema`. Invalid output: retry once, then `failed`.
4. **Evidence check (plain code):** the cited event exists and contains the quote. `getEvidenceFlags()` sets `flagged` and `hidden`.
5. **Big logs:** count tokens first; drop Read results, trim long tool output, then split at user prompts.

## Review loop (Zia)

- **Grading:** `callModel("grade", …)` returns `{ score: 0 | 1 | 2, missing, modelAnswer }` against the card's why, evidence and model answer.
- **Schedule:** score 2 moves a card to the next gap (1, 3, 7 days); below 2 restarts at day 1; passing day 7 sets `mastered`.
- **Emails:** Vercel Cron once a day (Hobby fires within the hour). `email_log` is unique per user, kind and day.
- **Progress:** "decisions you can still explain" = mastered cards + cards scored 2 in the last 7 days.

## Limits we design around

- Vercel Hobby functions run at most 300s, and `after()` work counts inside that limit.
- Hobby cron runs at most once per day.
- Gemini free tier may use inputs to improve Google's products: redaction stays strict and the setup page says so.
