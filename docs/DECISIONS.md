# Decisions

Newest first. Each entry: what we decided, why, and what we rejected.

## 2026-10-29 · Design system: Quartz skin, zip motion

- **Decision:** the components in `apps/web/src/components/ui/` take Quartz's look (design.how/systems/quartz: classes, radii, frames, type roles, states) and keep the vennsol design-system zip's micro-interactions as they were (switch squash, tab indicator slide, toast stacking, swipe and pulse, drawer swipe, checkbox blur check, dialog scale-in). Components Quartz has and the zip lacks (segmented-control, status, stat, page-header, data-list, timeline, code-block, copy-button) are ported from Quartz.
- **Why:** Zia wants Quartz's design and the zip's motion. Merging per component keeps one component per name and one API for the gallery and the app.
- **Rejected:** zip components re-skinned by tokens alone (they would keep the zip's shapes, not Quartz's); every Quartz component installed beside the zip's (two buttons, two inputs, two charts).
- **One Tailwind compile.** Quartz's `tokens.css` and `base.css` are vendored unchanged in `src/components/quartz/`. Its `styles.css` is a second, scoped compile (`--*: initial`, unlayered utilities under `.quartz`); it is vendored as `utilities.css` without that wrapper and imported from `globals.css`. `<body class="quartz">` holds the app, wrapped in `QuartzPortalProvider` (`src/lib/quartz/portal.ts`).
- **Why:** a second compile overrides every `globals.css` utility silently, and `@shadcn/lint` reads only the `globals.css` import graph, so it would flag every Quartz class as unknown.
- **Name clashes:** Quartz declares `--sidebar` (248px), `--popover` (288px) and `--font-sans`/`--font-mono` on `.quartz`. The shadcn colour variables `--sidebar`, `--popover` and friends are gone; the semantic colour names map straight to Quartz roles in `@theme`. `--font-sans`/`--font-mono` are set to Geist and Geist Mono on `.quartz`.
- **Motion tokens** stay the zip's: `--ease-out-quint`, `--ease-in-out-quint`, `--animate-toast-pulse-even/odd` and the reduced-motion reset on `[data-slot]`. Raw `cubic-bezier(0.22, 1, 0.36, 1)` copies in drawer and toast became `ease-out-quint`. Quartz's `--dur-*` and `--ease-step` stay available beside them.
- **Toasts:** the zip's Base UI toast, not `sonner` as `docs/plans/pages-and-dashboard.md` lists, to keep its stacking, swipe and pulse.
- **Style:** `base-nova` (what `components.json` and the installed components use), not `radix-nova` as the plan says.
- **Colours for scores and flags:** `success` is Quartz's mint kind (hue 5), `warning` is Quartz's amber. Quartz keeps warm hues for trouble, so success is not green-on-warm.
- **Icons:** Phosphor (`@phosphor-icons/react`), `iconLibrary: "phosphor"`. Files without `"use client"` import from `@phosphor-icons/react/ssr`, because the main entry calls `createContext` and breaks server components. `lucide-react` is removed.
- **Fonts:** Geist for UI, Geist Mono for code, Instrument Serif for marketing headlines only (`font-display`), all through `next/font`.
- **Lint gate:** `pnpm lint` (oxlint + `@shadcn/lint`) and `pnpm format` (oxfmt) only. Quartz's ESLint config is not installed. `src/lib/quartz/**` (vendored) turns off `react/refs`, whose two hits pass ref objects and callback refs without reading `.current` in render, and `react/no-children-prop`, because `createElement` in a `.ts` file has to pass `children` as a prop for its types.
- **URL state:** `nuqs` is approved for the gallery's section and tab state.
- **Theme:** the zip's three-way theme provider and toggle (`src/components/theme/`), moved to `useSyncExternalStore` for server rendering, with a `<head>` script that sets the class before paint.

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
