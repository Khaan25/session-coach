# Decisions

Newest first. Each entry: what we decided, why, and what we rejected.

## 2026-10-31 · Groq as temporary extraction backup, and prompt v2

- **Decision:** extraction runs on Groq `openai/gpt-oss-120b`, set through env only (`MODEL_PROVIDER`, `MODEL_EXTRACT`), with no code change. This is temporary. Gemini 3.8 Flash stays the target (#22) until a model comparison on the golden set. Zia agreed.
- **Why:** the `gemini-3.8-flash` free tier returned 503 or hung all day. A plain curl with a tiny prompt failed the same way while the model list returned 200, so the fault is not our code. Many forum reports have said the same since early October.
- **Limit:** the Groq free tier lists 8,000 tokens per minute, so large sessions may not fit.
- **First real run (one session, Groq):** 5 cards, 4 of 5 quotes verified, 3 `stated` cards downgraded to `inferred`. Hand check: 1 of 5 was a real decision; the rest were file writes, a deletion and a test result. One session only. Prompt v2 is the response: a decision needs two real options, one quote must state the choice or reason in words (a file write or shell command does not count), a card with no such quote is `inferred`, and zero cards is a valid answer (later replaced: Zia chose 3 to 5, see the extraction entry).
- **Rejected:** waiting for Gemini to recover (blocks Monday's demo); paying for Gemini billing (a forum poster doubted it fixes the 503s, and it costs money); `gemini-2.5-flash` (the API said it is closed to new users, 404).
- **Known gap:** `stated` is kept when a verified quote comes from a prompt or reply, even if the quote has no reason in it.

## 2026-10-31 · Extraction: card count, the stated rule, retry, file and lines

- **Decision:** Zia chose 3 to 5 decisions from the model (top key `decisions`, evidence `{ event: "E2", quote }`; code turns `E2` into `event_index` 2). Code, not the prompt, drops every card with no grounded quote: a verified quote from a prompt, a reply, or a write or edit of a file named `DECISIONS.md`. A session can end with 0 cards. A session with 0 to 2 surviving cards is still `ready` (agreed with Zia, done in `processSession`). `position` is set after the drops (0, 1, 2...). `files` keeps only paths that some write or edit event wrote, matched by suffix (equal, or ends with `/` + the path), because the model writes relative paths. An answer that fails the zod schema (including fewer than 3 or more than 5 decisions) gets one more call with the validation error in `data`; a second failure throws. `evidence.file` is filled by code from write and edit events (the path before `—`), never by the model; `lines` is `null` in v1.
- **Why:** the guide asks for 3 to 5, and the prompt can't enforce that a quote is real, so code drops what it can't ground. The model's own `source` can't be trusted, so the check uses only quotes that exist in the timeline. One retry with the error fixes most formatting slips without looping on a model that can't comply. The model can't see line numbers in the timeline, so a file path it wrote would be a guess, and lines would be too.
- **Rejected:** letting the model return fewer than 3 or 0 decisions; keeping ungrounded cards as `inferred`; trusting the model's `source`; more than one retry; letting the model fill `file` or `lines`.
- **Known gap:** a padded card that quotes a reply still passes, because a reply is a grounded source even when it holds no reason.
- **Known gap:** a `stated` reason quoted from a `DECISIONS.md` write rarely verifies yet. The parser keeps only the path and line count of a write, and a 60-character preview of an edit, so the reason text is usually not in the event. The basename rule stays; it starts to matter when the parser keeps more of those events.
- **Supersedes part of 2026-10-28 (`flagged` and `hidden`):** ungrounded cards are now dropped before storing instead of kept as hidden rows, so `hidden` will rarely be true. The accuracy check reads the runner's `DROPPED:` lines (each with its quotes, ✓/✗ and event kind) instead of hidden rows.
- **Observed 1 Nov (one session, two runs on Groq):** the same session gives different cards on each run, because the model picks different quotes each time. A real decision was dropped when the model shortened its quote with "..." (exact match fails, so no grounded quote). A non-decision ("not committing since you didn't ask") was kept because it quoted a reply.
- **Trade-off accepted for Monday:** the rule may drop a real decision when the model misquotes it, and may keep a reply-quoted non-decision. Kept cards were real decisions in both runs except that one.
- **Candidate fix (Wed, after the accuracy check measures how often this happens):** one repair call when a quote fails, asking the model to copy the exact words from that event. Send only the cited events' text, not the whole timeline, to stay under Groq's 8K tokens/minute.

## 2026-10-29 · The browser key stays the anon key

- **Decision:** the browser and server clients read `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not the starter's newer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Why:** the project already runs on the anon key in every environment, and `docs/plans/auth.md` lets us keep it; both keys get the same RLS. Renaming means changing every environment at once for no behaviour change.
- **Rejected:** switching to the publishable key now. Revisit when Supabase retires the anon key.

## 2026-10-29 · Auth redirect origins come from the request

- **Decision:** Server Actions build `emailRedirectTo` and the OAuth `redirectTo` from the request's `Origin` header; route handlers use `request.nextUrl.origin`. Never `NEXT_PUBLIC_SITE_URL`, never `x-forwarded-host`.
- **Why:** Next only runs a Server Action when `Origin` matches the host (its CSRF check), so the header is trusted there. Using the request's own origin keeps preview sign-ups and the PKCE cookie on the preview that started them (docs/plans/auth.md, edge cases 10, 12, 13).
- **Rejected:** `NEXT_PUBLIC_SITE_URL` (sends preview users to production and loses the PKCE cookie); `x-forwarded-host` (spoofable).

## 2026-10-29 · Design system: one look, the zip's motion

- **Decision:** the components in `apps/web/src/components/ui/` are the app's design system and its default look: one shape language (radii, frames, type roles, states) on shadcn base-nova, with the micro-interactions of the zip we started from kept as they were (switch squash, tab indicator slide, toast stacking, swipe and pulse, drawer swipe, checkbox blur check, dialog scale-in). Segmented control, status, stat, page header, data list, timeline, code block and copy button sit beside them.
- **Why:** one component per name and one API for the gallery and the app.
- **Styles apply to the whole page.** `src/styles/tokens.css`, `base.css` and `utilities.css` are imported into `globals.css` as one Tailwind compile; tokens sit on `:root`, with no wrapper class. Overlays portal through `PortalProvider` (`src/lib/ui/portal.ts`), which also makes the page inert behind a modal.
- **Why one compile:** a second compile would override every `globals.css` utility silently, and `@shadcn/lint` reads only the `globals.css` import graph.
- **Semantic names:** the shadcn colour names (`background`, `primary`, `muted`, `border`, `sidebar-*`...) map straight to the design system's roles in `@theme`; the old shadcn colour variables are gone.
- **Motion tokens** stay the zip's: `--ease-out-quint`, `--ease-in-out-quint`, `--animate-toast-pulse-even/odd` and the reduced-motion reset on `[data-slot]`. Raw `cubic-bezier(0.22, 1, 0.36, 1)` copies in drawer and toast became `ease-out-quint`. `--dur-*` and `--ease-step` stay available beside them.
- **Menu rows:** a keyboard-highlighted row (highlighted, not under the pointer) draws a 2px inset ink ring; a mouse-highlighted row shows only the wash, and no row gets the outer focus ring. The wash alone is about 1.1:1 (WCAG 1.4.11).
- **Menus animate:** dropdown, select and combobox popups fade, zoom and slide in 100ms, although the zip's carried `animate-none!`. Zia chose the animation. A select popup aligned over its trigger (`alignItemWithTrigger`, the default) appears in place instead, since sliding from a side it did not open on reads wrong.
- **Toasts:** the zip's Base UI toast, not `sonner` as `docs/plans/pages-and-dashboard.md` lists, to keep its stacking, swipe and pulse.
- **Style:** `base-nova` (what `components.json` and the installed components use), not `radix-nova` as the plan says.
- **Colours for scores and flags:** `success` is the mint kind (hue 5), `warning` is amber. Warm hues are kept for trouble, so success is not green-on-warm.
- **Icons:** Phosphor (`@phosphor-icons/react`), `iconLibrary: "phosphor"`. Files without `"use client"` import from `@phosphor-icons/react/ssr`, because the main entry calls `createContext` and breaks server components. `lucide-react` is removed.
- **Fonts:** Geist for UI, Geist Mono for code, Instrument Serif for marketing headlines only (`font-display`), all through `next/font`.
- **Lint gate:** `pnpm lint` (oxlint + `@shadcn/lint`) and `pnpm format` (oxfmt) only. `src/lib/ui/**` turns off `react/refs`, whose two hits pass ref objects and callback refs without reading `.current` in render, and `react/no-children-prop`, because `createElement` in a `.ts` file has to pass `children` as a prop for its types.
- **URL state:** `nuqs` is approved for URL state, but not installed: the gallery uses plain `#anchor` sections, so nothing needs it yet. Add it with the first real consumer.
- **Theme:** the zip's three-way theme provider and toggle (`src/components/theme/`), moved to `useSyncExternalStore` for server rendering, with a `<head>` script that sets the class before paint.
- **Next:** refactor `components/ui` down to bare-minimum primitives (fewer variants, props and parts; composition over options) before the data phases build on it.

## 2026-10-29 · Sign-in: email + password and Google; provider-neutral profiles

- **Decision:** Supabase Auth with email + password and Google (GitHub later through the same callback). `profiles.github_login` becomes `display_name` + `avatar_url`, filled from any provider. `email` stays copied in `profiles` and a trigger keeps it in sync; linked logins live in `auth.identities`. Learners may also update `display_name`.
- **Why:** learners can't read `auth.users`, and the Play Stats roster and learner pages need the email and name in one query. A copy table for identities would duplicate what Supabase already keeps.
- **Rejected:** reading email from `auth.users` on every request (needs the service role everywhere); a `user_identities` table.
- Plan and edge cases: `docs/plans/auth.md`.

## 2026-10-29 · Agent tooling, Play Stats API, live backend

- **Decision:** adopt the 8x template's agent setup: AGENTS.md holds the rules, a SessionStart brief, SessionEnd transcripts in `.claude-logs/`, git hooks (secrets, commit messages, pre-push gates) and `docs/rules/`.
- **Why:** one rule file every agent reads; transcripts can be reviewed on the branch next to the change; the hooks catch secrets and bad commit messages before CI does.
- **Decision:** add the Play Stats API per `docs/PLAY_API.md`.
- **Why:** the 8x stats dashboard reads each play's numbers from it.
- **Backend:** one Supabase project in ap-south-1; migrations go live with `supabase db push`. A Vercel project with root `apps/web`, connected to this repo, so every PR gets a preview.
- **Why:** ap-south-1 is the closest region to Pakistan and Nepal.
- **Commits carry no co-author trailers**; the commit-msg check rejects them.
- **Why:** the authors want the commit history to show only the people who made the change.
- **History rewrite:** `main` was reworded once, on 2026-10-29, to remove co-author trailers. Branch protection was removed for a few seconds to force-push the reworded commit (same tree, same author), then restored with identical settings. Anyone with an older clone (Kasam, if he has one) runs `git fetch && git reset --hard origin/main`.
- **Rejected:** PostHog analytics, deferred: there is no personal PostHog project yet.
- Pages and dashboard are planned in `docs/plans/pages-and-dashboard.md`, built after the design system.

## 2026-10-29 · `allowImportingTsExtensions` in `apps/web`

- **Decision:** `apps/web/tsconfig.json` sets `allowImportingTsExtensions: true`. Pipeline code and tests import siblings with the `.ts` extension (`./parser.ts`).
- **Why:** `node --test --experimental-strip-types` runs the files as written and needs the extension, the same as `packages/shared`. Without the flag `tsc` rejects those imports. The web tsconfig already has `noEmit`, which the flag requires, so it changes nothing in the Next.js build.
- **Rejected:** a separate tsconfig for tests (two configs to keep in sync); a test runner like vitest (new dependency for one parser).

## 2026-10-29 · Redaction in the parser

- **Decision:** parser output is redacted before storing: API keys/tokens (JWTs, sk-, ghp*, AIza, Bearer, Basic auth, github_pat*) and long letters+digits strings → [REDACTED]; `NAME=value` where NAME contains KEY, TOKEN, SECRET, PASSWORD or PASSWD → `NAME=[REDACTED]` (value is a quoted string or a run of non-space characters); emails → [EMAIL]; /Users/<name>/ and /home/<name>/ → ~/ (the name stops at shell operators, so `cd /Users/jane&&pnpm test` keeps its command). Hex runs of exactly 40 or 64 characters are left intact. Read paths get only the home-path rule so the path structure stays.
- **Why:** the repo is public and session logs carry emails and paths with the user's name. Second layer after "never paste secrets" + the pre-commit scan. The JWT rule goes first so a JWT whose signature starts with `sk-` is redacted whole. Git SHA-1/SHA-256 hashes are evidence, so they are kept; other hex lengths (such as 32) are still redacted.
- **Rejected:** a generic secret scanner (misses our own shapes such as home paths and emails, and flags path segments); redacting at display time instead of before storing (the raw text would sit in storage and in the repo); applying the full rule set to Read paths (the long-token rule would mangle path segments).
- **Known gaps:** a secret immediately after a "/" is skipped (so path segments aren't mistaken for tokens); Windows paths not covered; passwords embedded in URLs (`postgres://user:pass@host`) are not caught; a secret that is exactly 40 or 64 hex characters with no known prefix won't be caught, since those runs are skipped. Verified on the real Rapporteur log: 0 emails or user paths left in the events.

## 2026-10-28 · `flagged` and `hidden` on decision cards

- **Decision:** `flagged = true` when any evidence item has `verified: false`. `hidden = true` when no evidence item is verified; the row is kept and learners never see it.
- **Why:** hiding an unproven card protects learners from studying an invented reason. Keeping the row lets the accuracy check count every extracted card, including the ones that failed the check.
- **Rejected:** deleting unverified cards (breaks the accuracy numbers); flagging only downgraded stated cards (misses inferred cards with a bad quote).
- Postgres generates both columns from `evidence`, so a writer can't store flags that disagree with it. `getEvidenceFlags()` in `packages/shared/src/decision.ts` applies the same rule in code, and `decisionCardSchema` rejects cards where they differ. Pending Kasam's confirmation.

## 2026-10-28 · Learners only read; the server writes

- **Decision:** RLS gives learners `select` on their own rows, except `decision_cards.model_answer` (the answer key). Answers, scores, reviews, cards and session deletes go through the server with the service role key.
- **Exceptions:** learners may update their profile's `timezone` and `notify_email` (column grants, nothing else) and delete their own CLI tokens to revoke them.
- **Why:** a learner who can write `answers.score` or `reviews.mastered` can fake progress. Session deletes stay on the server so the Storage object is removed with the row.
- **Ownership:** child rows reference their parent by `(id, user_id)`, so a card, answer or review can't belong to a different learner than its session.

## 2026-10-28 · pnpm monorepo, Tailwind v4, shadcn/ui, `@shadcn/lint`

- **Decision:** pnpm workspaces with `apps/web`, `packages/shared`, `packages/cli`. Tailwind v4 + shadcn/ui, with `@shadcn/lint` enforcing design-system rules.
- **Why:** both halves import one Decision schema. The lint rules give the agent a concrete fix when it restyles a component, which keeps the UI consistent across two people and their agents.

## 2026-10-28 · `main` protected

- **Decision:** pull request required, 1 approving review, stale approvals dismissed, conversations resolved, no force pushes, no deletion, admins included.
- **Why:** two people and two agents on one repo; every change gets a second pair of eyes.
