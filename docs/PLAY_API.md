# Play Stats API: what Session Coach sends

**Contract implemented: 2026-10-29 · shape: website play, no billing.** Based on the 8x template's 2026-08-14 contract. Before changing the shape, get the current contract from the stats dashboard and ask what changed since this date.

## Endpoints

| Route                           | Purpose               |
| ------------------------------- | --------------------- |
| `GET /api/dashboard/v1/summary` | Headline counts       |
| `GET /api/dashboard/v1/users`   | The roster, paginated |

Auth on both: `Authorization: Bearer <DASHBOARD_API_KEY>`. Generate with `openssl rand -hex 32`, set it on the Vercel deployment, and paste the same value into the dashboard's connection. Wrong key: 401. Key not set: 503, so a deploy without the secret exposes nothing.

## /summary

| Field                            | Status         | Source                                                    |
| -------------------------------- | -------------- | --------------------------------------------------------- |
| `play`                           | always         | `PLAY_SLUG`, default `session-coach`                      |
| `users_total`                    | always         | every row in `profiles`                                   |
| `users_by_plan`                  | always         | `{ free: users_total }`: no billing yet                   |
| `new_users_7d` / `new_users_30d` | always         | `profiles.created_at`                                     |
| `generated_at`                   | always         | request time                                              |
| `retention.cohorts`              | when non-empty | signup day vs activity (session uploads + review answers) |
| `users_by_country`, `revenue`    | **never**      | no country captured, no billing                           |

Retention: a cohort member counts for `d1`/`d7`/`d30` when they uploaded a session or answered a review EXACTLY that many UTC days after signing up. A window the cohort hasn't reached is omitted, never 0. Activity older than 120 days is not read.

## /users

`{ users: [{ id, email, name, plan, granted, country, currency, created_at, last_seen_at }], next_cursor }`

- `name` is `profiles.display_name` (null when the provider gave no name); `plan` is always `free`; `country` and `currency` are `null`.
- `last_seen_at` is the latest session upload or review answer.
- Pagination: `?limit=` (1–100, default 50) and `?cursor=` from the previous `next_cursor`.
- `?plan=`: `free` lists everyone; `premium`, `trial`, `granted`, `promo`, `sandbox` return an empty list (true: nobody pays). Anything else: 400.
- `?stage=purchase`: empty list. Any other stage: 400, which the dashboard reads as "not tracked".

## Verifying

```bash
curl -s -H "Authorization: Bearer $DASHBOARD_API_KEY" http://localhost:3000/api/dashboard/v1/summary | jq
```

## Known gaps

- [ ] Connect the play in the stats dashboard with the deployment's `DASHBOARD_API_KEY`.
- [ ] Confirm the contract date with the dashboard (`integration_check`) once connected.
