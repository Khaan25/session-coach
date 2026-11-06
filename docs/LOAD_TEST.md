# Database load test

Which of the app's queries stop working as the data grows, and what fixed them. The suite and how to rerun it:
[scripts/load-test/README.md](../scripts/load-test/README.md). Run on 6 Nov 2026 on an Apple-silicon Mac, Postgres 17,
warm cache, no network: the ratios matter more than the milliseconds.

## What was measured

- **29 queries**, each the SQL PostgREST builds for a supabase-js call in `apps/web` (learner pages, the daily-review
  cron, the Play Stats roster, the public report, account deletion, the stuck-session sweep). Learner queries run as
  `authenticated` with the learner's JWT, so RLS applies; server queries as `service_role`. `fetchAll` reads loop over
  its 1000-row pages; writes are rolled back.
- **Four scales.** Scale k: 50·k typical learners with 20 sessions each, plus one heavy learner with 20·k sessions.
  1000x is 50,001 learners, 1M sessions, 3.1M cards, 2.0M reviews and 3.9M answers; the heavy learner has 55,000
  cards.
- **Statistics.** Up to 50 samples per query, learner, scale and phase (at least 5 for a query that takes a minute).
  Medians with 95% bootstrap intervals; before vs after by a two-sided Mann-Whitney U test with Benjamini-Hochberg
  correction over all 232 comparisons. A change counts when q < 0.05 and it is 10% or more.

## What broke

At 1000x, before the fix, 20 of 58 query-learner pairs were over 100 ms at p95, and three passed Supabase's 8 s
`statement_timeout` for learners, so they would have failed outright:

| Query                                        | 1000x, heavy learner | Cause                                                          |
| -------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `account.delete` (cascade from `auth.users`) | 104 s                | answers cascade ANDed with the learner's whole `user_id` index |
| `learner_ownership()` (dashboard meter)      | 88 s                 | same, once per card                                            |
| `getCardPath`                                | 12.3 s               | cards joined from sessions the same way                        |

The cause is the same in all three. RLS adds `user_id = auth.uid()` to every table a learner query touches. Where a
join found rows by `card_id` or `session_id`, Postgres combined that lookup with a bitmap of the learner's entire
`user_id` index on every loop, so the cost grew with the square of the learner's cards. The projected daily-review
cron (all learners, 400 chunks of 100) reached 133 s at 1000x, against Vercel's 300 s limit.

## The fix

[`20261106000000_scale_indexes.sql`](../supabase/migrations/20261106000000_scale_indexes.sql), indexes only:

- `answers (card_id, user_id)` and `decision_cards (session_id, user_id)`, the foreign keys' own columns, so the RLS
  condition is part of one index probe. Replaces `answers_card_idx`.
- `reviews (user_id, card_id)`: `reviews_due_idx` is partial (not mastered), so every other read by learner walked
  the primary key.
- `decision_cards (user_id, id)` and `answers (user_id, id)`: service-role reads, the cascade, and `fetchAll` pages.
- `decision_cards (user_id, created_at) where not hidden`: the review queue's new cards. Added after the 100x run
  showed `reviews (user_id, card_id)` pushing that query into a hash join of all the learner's reviews (3x slower).
- `sessions (created_at) where status = 'pending'`: the stuck-upload sweep.

Applied to the live project on 6 Nov 2026.

## After

| At 1000x                     | Before | After   | Speed-up (95% CI) |
| ---------------------------- | ------ | ------- | ----------------- |
| `learner_ownership()`, heavy | 88 s   | 203 ms  | 436x (423–450)    |
| `account.delete`, heavy      | 104 s  | 560 ms  | 185x (136–206)    |
| `getCardPath`, heavy         | 12.3 s | 148 ms  | 83x (78–88)       |
| `progress.reviews`, typical  | 52 ms  | 0.05 ms | 1032x (1002–1064) |
| `report.owned`, typical      | 30 ms  | 0.17 ms | 175x (153–183)    |
| stuck-upload sweep           | 73 ms  | 1.4 ms  | 52x (47–61)       |
| `queue.recent`, heavy        | 529 ms | 26 ms   | 20x (20–21)       |
| daily-review cron, projected | 133 s  | 15 s    |                   |

No query passes the statement timeout at any scale after the fix; 14 of 58 pairs stay over 100 ms at 1000x.

## Still slow

These are not index problems. `fetchAll` pages with `OFFSET`, so each 1000-row page re-joins and re-sorts the learner's
whole set, and the total grows with the square of their rows. For the heavy learner at 1000x:

- `progress.cards` 4.4 s, `defend.count` 3.1 s and `progress.reviews` 246 ms (`getProgress`, `defendableCount`)
- `cron.reviews` 4.8 s and `roster.answers` 6.2 s for the 100-learner chunk that holds them (5.3 s before: 16% slower,
  the one meaningful regression, from the planner preferring `answers_user_id_idx`)

Each page stays well under the 8 s timeout, so nothing fails, but the fix is in the app: keyset paging in `fetchAll`
(`where id > last order by id`), or counting in SQL (`defendableCount` needs one number, not every answer).
