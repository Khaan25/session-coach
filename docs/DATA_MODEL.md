# Data model

What the database stores, who writes each part, and why it is built that way. The source of truth is the SQL in
[`supabase/migrations/`](../supabase/migrations/); this file explains it. Migrations are read-only once merged: a
change is a new migration ([rules/migrations.md](rules/migrations.md)), and this file is updated in the same PR.

- [`20261028000000_init.sql`](../supabase/migrations/20261028000000_init.sql): every table, RLS, the bucket, Realtime.
- [`20261029000000_auth_profiles.sql`](../supabase/migrations/20261029000000_auth_profiles.sql): provider-neutral
  profiles (`display_name`, `avatar_url`) and the email sync trigger.

## The one rule

**Learners read their own rows. The server writes everything else.**

A learner's browser holds a JWT and the public anon key, and can send any query PostgREST allows. If a learner could
write `answers.score`, `reviews.mastered` or `decision_cards.evidence`, they could fake progress or un-hide a card the
evidence check rejected. So RLS grants learners `select` on their own rows and almost nothing else. Writes go through
route handlers (and, later, the pipeline) using the service-role client, which bypasses RLS; those routes check the
caller in code first ([rules/authorization.md](rules/authorization.md)).

The only learner writes:

| Table        | Write                                             | Why it is safe                                                   |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| `profiles`   | update `display_name`, `timezone`, `notify_email` | Column grants: nothing that affects scores, identity or billing. |
| `cli_tokens` | delete own rows                                   | Revoking a token can only remove access, never add it.           |

Who's "server" in the tables below: a route handler or script using `createAdminClient()`
([`apps/web/src/lib/supabase/admin.ts`](../apps/web/src/lib/supabase/admin.ts)), or a Postgres trigger.

## Ownership through composite foreign keys

Every child row carries `user_id` and references its parent by `(id, user_id)`, not by `id` alone:

```
profiles.id
  └─ sessions (id, user_id)            unique (id, user_id)
       └─ decision_cards (session_id, user_id) → sessions (id, user_id)
            └─ answers (card_id, user_id) → decision_cards (id, user_id)
            └─ reviews (card_id, user_id) → decision_cards (id, user_id)
```

**Attack prevented:** a server bug (or a future pipeline stage) that writes a card under learner A's `user_id` for
learner B's session. With a plain `session_id` foreign key that row would be accepted, and RLS would show B's work to
A. The composite key makes Postgres reject it. Every `user_id` also cascades from `profiles`, so deleting the auth user
removes every row.

## Tables

### `profiles`

One row per auth user, created by a trigger on sign-up. Learners can't read `auth.users`, so anything the app shows
about a person (name, email) is copied here.

| Column         | Stores                                                                 | Written by                               |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| `id`           | The `auth.users` id. Cascades on user delete.                          | Trigger `handle_new_user`                |
| `email`        | Copy of `auth.users.email`, for RLS reads and the Play Stats roster.   | Triggers (`handle_new_user`, email sync) |
| `display_name` | Trimmed, 1–100 characters, or null. Never `""`.                        | Trigger at sign-up; learner after        |
| `avatar_url`   | `https://` only, from the provider's metadata.                         | Trigger                                  |
| `timezone`     | IANA name, default `UTC`. Decides the learner's "today" for due dates. | Learner                                  |
| `notify_email` | Whether the daily review email is sent. Default true.                  | Learner                                  |
| `created_at`   | Sign-up time; the Play Stats cohorts group by its UTC day.             | Default                                  |

- **Policies:** `read own profile` (select where `id = auth.uid()`), `update own profile` (same, with check).
- **Grants:** `update` is revoked from `anon` and `authenticated`, then granted back on `timezone`, `notify_email`
  and `display_name` only. **Attack prevented:** a learner setting `email` to someone else's address (which the roster
  and future emails would trust), or setting `avatar_url` to a non-provider URL.
- **Checks:** `display_name` must equal its own `btrim` and be 1–100 characters, so a blank or padded name can't be
  stored; send `null` to clear it. `avatar_url like 'https://%'` keeps `javascript:` and `http:` URLs out of `<img>`.
- **Why email is copied:** reading it from `auth.users` needs the service role on every request; the roster needs
  email and name in one query (DECISIONS.md, 2026-10-29).

### `cli_tokens`

Bearer tokens the CLI uses to upload sessions. Created on `/setup` through `POST /api/cli/tokens`.

| Column         | Stores                                                                             | Written by                   |
| -------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `id`           | Token id, used to revoke it.                                                       | Default                      |
| `user_id`      | Owner.                                                                             | Server                       |
| `token_hash`   | sha256 of the raw token, 64 hex characters. Unique. The raw token is never stored. | Server                       |
| `label`        | Optional name ("work laptop"), at most 100 characters (route check).               | Server                       |
| `last_used_at` | When the upload API last accepted it.                                              | Server (upload API, planned) |
| `created_at`   | Creation time.                                                                     | Default                      |

- **Policies:** `read own tokens`, `delete own tokens`. No insert or update policy.
- **Why hash:** a leaked database dump or log can't be replayed as a token. sha256 without a salt is enough here
  because the token is 32 random bytes, not a password a person chose. The upload API hashes the bearer value
  ([`lib/tokens/hash.ts`](../apps/web/src/lib/tokens/hash.ts)) and looks up the hash.
- **Why no learner insert:** the server must generate the token so it has enough entropy and the `sc_` prefix secret
  scanners recognise. The route returns `id, label, created_at, last_used_at` and the raw token once; never
  `token_hash`.

### `sessions`

One uploaded Claude Code session and its processing status.

| Column                                      | Stores                                                                                    | Written by        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------- |
| `id`                                        | Session id.                                                                               | Default           |
| `user_id`                                   | Owner.                                                                                    | Server            |
| `external_id`                               | Claude Code's `session_id`. `unique (user_id, external_id)`: a repeat upload returns 409. | Server            |
| `agent`                                     | `claude-code` or `codex`.                                                                 | Server            |
| `title`                                     | The agent's title for the session, if the log had one.                                    | Server            |
| `repo`, `branch`                            | Where the work happened; the fallback name ("repo on branch").                            | Server            |
| `started_at`, `duration_min`, `event_count` | Session facts from the log (non-negative checks).                                         | Server            |
| `raw_path`                                  | Storage path of the redacted `.jsonl.gz`. Not empty.                                      | Server            |
| `status`                                    | `pending`, `processing`, `ready` or `failed`.                                             | Server (pipeline) |
| `error`                                     | A learner-readable reason when `failed`.                                                  | Server (pipeline) |
| `created_at`                                | Upload time. Indexed with `user_id` for the dashboard's newest-first list.                | Default           |

- **Policies:** `read own sessions`. **No learner delete:** the server deletes the Storage object first, then the row;
  a learner delete would orphan the log in Storage.
- `unique (id, user_id)` exists only as the target of the cards' composite foreign key.
- Realtime publishes this table (see below).

### `decision_cards`

The 3–5 decisions extracted from a ready session, each with a question for the learner.

| Column                  | Stores                                                                          | Written by |
| ----------------------- | ------------------------------------------------------------------------------- | ---------- |
| `id`                    | Card id.                                                                        | Default    |
| `session_id`, `user_id` | Parent session and owner (composite foreign key).                               | Server     |
| `position`              | Order within the session, `unique (session_id, position)`.                      | Server     |
| `decision`              | What the agent decided.                                                         | Server     |
| `why`                   | The reason.                                                                     | Server     |
| `source`                | `stated` (the agent said why) or `inferred` (the model's guess).                | Server     |
| `evidence`              | JSON array, at least one item: `{ event_index, quote, file, lines, verified }`. | Server     |
| `files`                 | Files the decision touched.                                                     | Server     |
| `question`              | What the learner is asked.                                                      | Server     |
| `model_answer`          | **The answer key.** Never readable by learners.                                 | Server     |
| `flagged`               | Generated: some evidence item is not verified.                                  | Postgres   |
| `hidden`                | Generated: no evidence item is verified.                                        | Postgres   |
| `created_at`            | Insert time; the review queue offers never-answered cards from the last 7 days. | Default    |

- **Policy:** `read own visible cards`: `user_id = auth.uid() and not hidden`. **Attack prevented:** studying a
  reason the evidence check couldn't prove. The row is kept (not deleted) so the accuracy check can count every
  extracted card (DECISIONS.md, 2026-10-28).
- **Column grant:** `select` is revoked from `anon` and `authenticated`, then granted on every column except
  `model_answer`. **Attack prevented:** reading the answer key from the browser before answering. Side effect:
  `select *` fails for learners, so the app always names columns
  ([`lib/cards/columns.ts`](../apps/web/src/lib/cards/columns.ts)). The key reaches the browser only in the response
  of `POST /api/review/answer`, after the answer is saved.
- **Evidence check constraint:** `evidence` must be a non-empty array of objects that each have a boolean `verified`.
  Without it, an item missing `verified` would read as "not true" in one rule and "not false" in the other, and the
  generated flags would disagree.
- **Generated columns** (`generated always as (...) stored`):
  - `flagged = jsonb_path_exists(evidence, '$[*] ? (@.verified != true)')`
  - `hidden = not jsonb_path_exists(evidence, '$[*] ? (@.verified == true)')`

  Postgres computes both on every write, so no writer (pipeline bug, seed script, SQL editor) can store a flag that
  disagrees with the evidence. `getEvidenceFlags()` in
  [`packages/shared/src/decision.ts`](../packages/shared/src/decision.ts) applies the same rule in code. Never write
  either column; an insert that names them fails.

- **Index:** `decision_cards_user_idx (user_id) where not hidden`, matching the learner policy.

### `answers`

Every explanation a learner submitted and its grade. Append-only history.

| Column               | Stores                                                                 | Written by |
| -------------------- | ---------------------------------------------------------------------- | ---------- |
| `id`                 | Answer id.                                                             | Default    |
| `card_id`, `user_id` | The card and owner (composite foreign key).                            | Server     |
| `review_step`        | The card's step when answered: 0 first try, 1–3 the day 1/3/7 reviews. | Server     |
| `answer`             | The learner's text (1–4000 characters, checked by the route).          | Server     |
| `score`              | 0 wrong, 1 partly, 2 got it.                                           | Server     |
| `missing`            | What the grader said the answer left out, or null.                     | Server     |
| `created_at`         | Answer time. Indexed with `user_id` for progress and Play Stats.       | Default    |

- **Policy:** `read own answers`. No learner writes: **attack prevented** is a learner inserting `score = 2` rows.

### `reviews`

One row per answered card: where it is in the day 1/3/7 schedule.

| Column       | Stores                                                             | Written by |
| ------------ | ------------------------------------------------------------------ | ---------- |
| `card_id`    | Primary key: one row per card.                                     | Server     |
| `user_id`    | Owner (composite foreign key with `card_id`).                      | Server     |
| `step`       | 0–3: the next review is day 1, 3 or 7.                             | Server     |
| `due_on`     | The learner-local date the card is next due; null once mastered.   | Server     |
| `last_score` | The latest score.                                                  | Server     |
| `mastered`   | Passed the day 7 review.                                           | Server     |
| `updated_at` | Last change. The grading route uses it as a compare-and-set guard. | Server     |

- **Check:** `mastered = (due_on is null)`, so a card can't be both pending and undated, or mastered and still due.
- **Policy:** `read own reviews`. **Attack prevented:** a learner setting `mastered = true` or pushing `due_on` away.
- **Why one row per card, not a row per future review:** the step and due date are all the queue needs; future rows
  would have to be deleted every time a low score restarts the card.
- A card has no row until its first answer. The queue finds new cards from `decision_cards` instead.
- **Index:** `reviews_due_idx (user_id, due_on) where not mastered`, for the "due today" count.

### `email_log`

One row per email sent (the daily review email, planned).

| Column      | Stores                                    | Written by |
| ----------- | ----------------------------------------- | ---------- |
| `user_id`   | Recipient.                                | Server     |
| `kind`      | `lesson_ready` or `daily_review`.         | Server     |
| `sent_on`   | The day it counts for.                    | Server     |
| `resend_id` | The provider's message id, after sending. | Server     |

- `unique (user_id, kind, sent_on)`: the cron inserts this row **before** sending; a conflict means another run
  already claimed it, so a rerun or a crash never sends twice ([rules/error-handling.md](rules/error-handling.md)).
- **No policies at all:** RLS is on, so learners can't read or write it.

## Triggers

Both are `security definer` with `search_path = ''`, so they run with the owner's rights (they write `profiles`, which
the inserting role can't) and can't be hijacked by an object a caller puts earlier on the search path.

- **`handle_new_user`** (`after insert on auth.users`): inserts the profile. `display_name` takes the first non-blank
  of `full_name`, `name`, `user_name` from the provider metadata (Google, GitHub, or the `full_name` that `signUp()`
  sends), trimmed to 100 characters; `avatar_url` takes `avatar_url` or `picture` when it starts with `https://`.
  Every field may be missing, and `on conflict (id) do nothing`, so bad metadata never blocks a sign-up.
- **`handle_user_email_change`** (`after update of email on auth.users`, only when it changed): copies the new address
  into `profiles.email`. With Secure email change on, Supabase changes `auth.users.email` only after both addresses
  confirm, so the copy changes once, at the right time.

## Storage

- **Bucket `sessions`**, private (`public = false`). It holds each session's redacted log as gzipped JSONL.
- **Layout:** `<user_id>/<file>.jsonl.gz`; the fixtures name the file after the session. `sessions.raw_path` holds the
  full path.
- **No `storage.objects` policies:** only the service role reads or writes it. Learners never download raw logs; they
  see cards.
- **Deletes are manual.** No foreign key reaches Storage, so deleting a row leaves its object behind. That is why
  learners can't delete sessions, and why account deletion removes objects before the auth user
  ([`app/api/account/route.ts`](../apps/web/src/app/api/account/route.ts)): it collects every `raw_path` plus a listing
  of the `<user_id>/` folder (to catch uploads whose row was never written), and only deletes paths inside that folder
  ([`lib/settings/account-storage.ts`](../apps/web/src/lib/settings/account-storage.ts)).

## Realtime

`alter publication supabase_realtime add table public.sessions`: only `sessions` is published, so the dashboard can
show `pending -> processing -> ready | failed` without polling.

Realtime applies the table's RLS `select` policy to each subscriber, using the JWT the socket joined with. A socket
that joins before the browser client has loaded the session joins as `anon`, and every event is filtered out. So
[`use-live-sessions.ts`](../apps/web/src/lib/sessions/use-live-sessions.ts) calls `realtime.setAuth(access_token)`
before `subscribe()`. Cards are not published: when a session turns `ready`, the client counts its cards with a normal
RLS query, which hides hidden cards.

## Deriving values

| Value                             | Where it is decided                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `flagged`, `hidden`               | Postgres generated columns; `getEvidenceFlags()` mirrors them in code.                                                                     |
| Next `step`, `due_on`, `mastered` | [`lib/review/schedule.ts`](../apps/web/src/lib/review/schedule.ts) `nextReview()`, in the learner's time zone.                             |
| "Due today"                       | `reviews.due_on <= today` (learner's zone) and not mastered.                                                                               |
| "Can still explain"               | Mastered cards plus cards scored 2 in the last 7 days, each once ([`lib/progress/progress.ts`](../apps/web/src/lib/progress/progress.ts)). |
| Retention (Play Stats)            | Any session upload or answer counts as active ([`lib/play-stats.ts`](../apps/web/src/lib/play-stats.ts)).                                  |
