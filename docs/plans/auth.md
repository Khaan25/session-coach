# Plan: email + password and Google sign-in

> Replaces Phase 2 of [pages-and-dashboard.md](pages-and-dashboard.md) ("Auth and the app shell").
> Build after the design system. One PR, owner Zia. GitHub sign-in can be added later through the
> same callback route with `provider: "github"`.
>
> **Drift check (run first)**: run `git log -1 --format=%h -- docs/plans/auth.md` to get the commit that
> last changed this plan, then `git diff --stat <that>..HEAD -- apps/web/src supabase/migrations packages/shared`.

## Status

- **Priority**: P1 · **Effort**: M · **Risk**: MED (sessions, redirects, email delivery)
- **Depends on**: design system merged; migration `20261029000000_auth_profiles.sql` applied live
- **Planned at**: 2026-10-29. Sources read the same day: Supabase docs (server-side auth for Next.js,
  advanced guide, passwords, Google login, redirect URLs, identity linking, rate limits, SMTP,
  password security, email templates, sessions, managing user data) and the `vercel/next.js`
  `examples/with-supabase` starter (commit of 2026-10-19).

## Database (done in this PR's migration, tested on Postgres 17)

`supabase/migrations/20261029000000_auth_profiles.sql` makes `profiles` provider-neutral:

- `github_login` is replaced by `display_name` (trimmed, 1–100 characters) and `avatar_url` (https
  only). Existing rows are backfilled from `auth.users` metadata before the drop.
- `handle_new_user` reads `full_name` → `name` → `user_name` and `avatar_url` → `picture`, so
  Google, GitHub and email sign-ups fill the same columns. Missing metadata never blocks sign-up.
- `email` stays copied in `profiles` (learners can't read `auth.users`; the Play Stats roster needs
  one query). A trigger copies it again when `auth.users.email` changes. With **Secure email
  change** on, that only happens after the new address is confirmed.
- Linked logins live in `auth.identities`; there's no copy table. A server that needs a GitHub
  handle reads `identity_data ->> 'user_name'` with the service role.
- Learners may now update `display_name` as well as `timezone` and `notify_email`.
- Types: `packages/shared/src/profile.ts` (`profileSchema`, `profileUpdateSchema`).

**Deploy order:** merge the PR (its `/users` route reads `display_name`), wait for the production
deploy, then `supabase db push`. Between those two steps only the Play Stats roster returns 502.

## Packages

- `@supabase/ssr` (0.12.x at time of writing) for cookie sessions. No other auth library.
- Env: the starter now names the browser key `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Either add it
  (Supabase dashboard → API keys → publishable) or keep `NEXT_PUBLIC_SUPABASE_ANON_KEY`; pick one
  and record it in `.env.example`. `NEXT_PUBLIC_SITE_URL` is set for production only.

## Files (follow the starter's layout)

| File                                                                  | Role                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/proxy.ts`                                                        | Next 16's renamed middleware (`export function proxy`). Creates the server client, calls `supabase.auth.getClaims()` straight away, returns `supabaseResponse`, redirects signed-out app routes to `/login?next=…`. |
| `src/lib/supabase/server.ts`                                          | `createServerClient` with `cookies().getAll/setAll`; `setAll` in try/catch (Server Components can't set cookies). Created per request, never at module scope.                                                       |
| `src/lib/supabase/client.ts`                                          | `createBrowserClient` for client components.                                                                                                                                                                        |
| `src/lib/supabase/proxy.ts`                                           | The refresh helper `proxy.ts` calls. Applies the cache headers `setAll` receives to the response.                                                                                                                   |
| `src/lib/auth/safe-next.ts` (+ test)                                  | Resolves `next` against the request origin with `new URL()`; returns the path only when origins match, else `/dashboard`.                                                                                           |
| `src/app/(auth)/login/page.tsx`                                       | Email + password form, "Continue with Google", links to sign-up and forgot password.                                                                                                                                |
| `src/app/(auth)/sign-up/page.tsx`, `sign-up/check-email/page.tsx`     | Sign-up form; always lands on "check your email".                                                                                                                                                                   |
| `src/app/(auth)/forgot-password/page.tsx`, `update-password/page.tsx` | Reset request; set new password.                                                                                                                                                                                    |
| `src/app/auth/confirm/page.tsx`                                       | Shows a "Confirm" button; its Server Action calls `verifyOtp({ type, token_hash })`, then redirects to `safeNext(next)`. A page, not a GET route, because link scanners open links before people do.                |
| `src/app/auth/callback/route.ts`                                      | OAuth: `exchangeCodeForSession(code)`, then redirect to `safeNext(next)`.                                                                                                                                           |
| `src/app/auth/error/page.tsx`                                         | Shows an error by code, never a raw message from the URL.                                                                                                                                                           |
| `src/app/(auth)/actions.ts`                                           | Server Actions: `signIn`, `signUp`, `signInWithGoogle`, `requestReset`, `updatePassword`, `resendConfirmation`, `signOut`.                                                                                          |

## Flows (exact calls)

- **Sign-up:** `auth.signUp({ email, password, options: { emailRedirectTo: <origin>/auth/confirm?next=/dashboard, data: { full_name } } })` → "check your email".
- **Confirm:** email link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}` → button → `verifyOtp`.
- **Sign-in:** `auth.signInWithPassword({ email, password })`. Error code `email_not_confirmed` shows a resend button (`auth.resend({ type: "signup", email })`).
- **Google:** a Server Action calls `auth.signInWithOAuth({ provider: "google", options: { redirectTo: <request origin>/auth/callback?next=… } })`, then `redirect(data.url)`.
- **Reset:** `auth.resetPasswordForEmail(email, { redirectTo })`; the email link goes to `/auth/confirm?…&type=recovery&next=/update-password`; that page calls `auth.updateUser({ password })`.
- **Sign-out:** a POST Server Action calling `auth.signOut({ scope: "local" })`. Settings gets a "sign out everywhere" button (`scope: "global"`).
- **Auth checks:** `getClaims()` for routing and reads. `getUser()` (a network call) before sensitive writes: grading, token creation, account deletion. Never trust `getSession()` on the server.

## Edge cases and how each is handled

1. **Unconfirmed email signs in:** `email_not_confirmed` → resend button.
2. **Resend spam:** Supabase allows 1 per user per 60 s; a 60 s client cooldown and generic copy.
3. **Account enumeration on sign-up:** a duplicate confirmed email returns a fake user. Always show "check your email"; never branch on `identities`.
4. **Enumeration on reset:** always "if an account exists, we sent a link".
5. **Open redirect through `next`:** `safeNext()` (origin comparison). `//evil.com` and `/\evil.com` fall back to `/dashboard`. Unit-tested.
6. **The starter redirects to `next` unchecked in `/auth/confirm`:** use `safeNext()` there too.
7. **Raw error text in the URL:** pass an error code, map it to copy on `/auth/error`.
8. **Link scanners use up one-time tokens:** confirm is a page with a button (POST), not a GET handler.
9. **Email link opened in another browser:** `token_hash` + `verifyOtp` needs no PKCE cookie; don't use `{{ .ConfirmationURL }}`.
10. **PKCE cookie lost across domains:** build OAuth `redirectTo` from the request's own origin, never from `NEXT_PUBLIC_SITE_URL`, so previews call back to themselves.
11. **Preview redirect URLs:** allow-list `https://*-zia-ur-rehman-khans-projects.vercel.app/**` in Supabase; production uses exact URLs.
12. **Email links on previews:** templates built on `{{ .RedirectTo }}` keep preview users on the preview.
13. **Spoofed `x-forwarded-host`:** derive origins from `request.nextUrl.origin` only.
14. **Google with the email of a confirmed password account:** Supabase links them to one user automatically. Nothing to build; test it.
15. **Google with the email of an unconfirmed password account:** Supabase drops the unconfirmed identity. That blocks email squatting; document it on the support page.
16. **Google-only user asks for a reset:** the email lets them add a password. Also show "Continue with Google" on the reset page.
17. **Email change:** turn on Secure email change (both addresses confirm) and the "email changed" notification. The trigger syncs `profiles.email` after confirmation.
18. **Deleted or banned user with a live JWT:** keep JWT expiry ≤ 1 h; `getUser()` before sensitive writes; RLS everywhere.
19. **Refresh in Server Components:** refresh only in `proxy.ts`. Refreshing in two places trips refresh-token reuse detection and signs the user out.
20. **Cached `Set-Cookie` leaking a session:** apply the `setAll` cache headers; never `"use cache"` user data; with `cacheComponents`, keep auth reads inside `<Suspense>`.
21. **Fluid compute shares module state:** create Supabase clients inside each request.
22. **Rate limits:** sign-up and sign-in allow 30 per 5 min per IP. Server Actions call from Vercel's IPs, so all users may share one bucket. Add our own per-IP limit (from `x-forwarded-for` on Vercel) on sign-up, sign-in and reset. Unconfirmed which IP Supabase counts: test it.
23. **Weak passwords:** dashboard minimum length 10 (the config default is 6) plus character requirements; show the `WeakPasswordError` reasons. Leaked-password protection needs the Pro plan: deferred.
24. **Default SMTP:** 2 emails per hour, team addresses only. Custom SMTP (Resend, already planned for reminders) before any real user; then raise the email rate limit.
25. **Email click tracking rewrites links:** turn it off for auth emails in the SMTP provider.
26. **CSRF:** Server Actions are POST with Next's Origin check; sign-out is never a GET link.
27. **Empty display name:** send `null` to clear it, never `""` (the database check and `profileUpdateSchema` reject blank names).
28. **Avatars:** add `lh3.googleusercontent.com` and `avatars.githubusercontent.com` to `images.remotePatterns` before showing them with `<Image>`.
29. **Bots:** if sign-up abuse appears, turn on Supabase CAPTCHA (Turnstile).

## Manual setup (a person does these; nothing here goes in the repo)

**Google Cloud:** create a project → Google Auth Platform: Audience External, Branding (name, logo, `/privacy` and `/terms` URLs, authorized domain), scopes `openid`, email, profile → submit brand verification (a few business days) → OAuth client "Web": JS origins = production origin and `http://localhost:3000`; redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`. Preview URLs aren't needed in Google.

**Supabase dashboard:**

1. Auth → Providers → Google: enable, paste the client ID and secret.
2. URL Configuration: Site URL = production; redirect URLs = production paths, `http://localhost:3000/**`, the Vercel preview wildcard.
3. Email: Confirm email on, Secure email change on, minimum password length 10 + character requirements.
4. Email Templates: Confirm signup, Reset password and Change email use the `token_hash` links above.
5. SMTP: custom provider, then raise the email rate limit.
6. JWT: move to asymmetric signing keys so `getClaims()` verifies locally.

**Vercel:** the Supabase URL and browser key for all environments; `NEXT_PUBLIC_SITE_URL` for production. Deployment Protection is on for every `*.vercel.app` URL; that's fine for previews, but the production URL needs a custom domain or protection relaxed before outside users or the stats dashboard can reach it.

## Done criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass; `safe-next.test.ts` covers `/x`, `//evil.com`, `/\evil.com`, `https://evil.com`, empty.
- [ ] On the preview: email sign-up → confirm → `/dashboard`; Google sign-in → `/dashboard`; reset → new password works; sign-out returns to `/`.
- [ ] A Google sign-in with the email of an existing confirmed password account leaves one row in `profiles` and two in `auth.identities`.
- [ ] `profiles` rows from Google and email sign-ups have `display_name` (Google) and `email` filled.
- [ ] `rg -l '"use client"' apps/web/src | xargs -r rg -l SERVICE_ROLE` prints nothing.
- [ ] A signed-out `GET /dashboard` redirects to `/login?next=%2Fdashboard`.

## STOP conditions

- Next 16's docs in `apps/web/node_modules/next/dist/docs/` describe a different proxy/middleware API than above.
- A flow needs a learner-writable column beyond `display_name`, `timezone`, `notify_email`: that's a migration and a team decision.
- Custom SMTP isn't set up: don't invite real users; the default sender reaches team addresses only.
