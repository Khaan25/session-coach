<context>
Repo: session-coach, pnpm monorepo. The web app is `apps/web` (Next.js 16.4.3, React 19.3.0, Tailwind v4, shadcn/ui on Base UI, `motion` 14.3.0, `tw-animate-css`). Read `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md` and `docs/rules/components.md` first. Branch `claude/ui-redesign-animations-64dd03` equals `main` (no drift, no open PRs, checked 2026-11-06).

Goal of this run: restyle the whole web app (signed-in app, auth, marketing) in the visual style of https://serveros.com/, cut clutter so each page has one obvious job, and give routes life with view transitions and small, purposeful motion.

Reference: serveros.com, measured in a browser on 2026-11-06 (computed styles, not guesses):

- Type: Mona Sans for headings and UI. h1 56px / 60px line height, weight 450, letter-spacing -0.04em (-2.24px). h2 44px / 48px, weight 550, letter-spacing -0.04em. Body copy 17px / 26px, muted grey `#6b6b66`. Buttons 13-14px, weight 500. Geist Mono for code.
- Colour: white page `#ffffff`, near-black text `#0a0a0a` / `#111111`, hairline borders `#ededed` and `#dededa`, one saturated accent blue `#1c4bb0` with a lighter border `rgba(59,123,255,0.6)`. A soft blue radial wash sits behind the hero; one dark section ("open source") inverts to white text.
- Shape: small radii (6-7px on buttons), 32px and 36px control heights, 12px horizontal padding, no shadows on controls, flat cards with 1px hairline borders, content max-width 1280px, text columns 640px.
- Layout: very few elements per screen. A big two-line headline (statement + muted second line), one short paragraph, two buttons (primary filled, secondary outlined) and a product screenshot. Each section is one claim plus one visual. The nav is a plain row at the top that turns into a floating, bordered pill once the page scrolls.
- Motion: entrances blur in (`opacity 0 -> 1`, `filter: blur(8px) -> 0`, `translate: 0 18px -> 0`). Easing `cubic-bezier(0.32, 0.72, 0, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)` for movement, `cubic-bezier(0.4, 0, 0.2, 1)` at 150ms for hover colour changes. Sections blur in on scroll. A few ambient loops (slow grid breathe, CTA drift) run for 5-45s.

Current state (evidence):

- Tokens live in `apps/web/src/styles/tokens.css` (radius 265-269, durations `--dur-*` 281-296, easings 297+, surfaces 326-354, `--border-hair` 373, reduced-motion zeroing 776-799). `base.css`, `utilities.css` and `theme.css` sit beside it; all are imported by `apps/web/src/app/globals.css`, which `@shadcn/lint` reads as one graph.
- Fonts: `apps/web/src/app/layout.tsx:2` loads Geist, Geist_Mono and Instrument_Serif (`--font-display`, marketing headlines). `Mona_Sans` is available from `next/font/google`.
- Route groups: `(marketing)/layout.tsx` (SiteNav + SiteFooter), `(auth)/layout.tsx`, `auth/` (confirm, error), `(app)/layout.tsx:52-70` (SidebarProvider + AppSidebar + sticky topbar with breadcrumb). Unwrapped: `design-system/`, `canvas/`. No `template.tsx`, no `loading.tsx`.
- Duplicated components: `components/ui/page-header` vs `components/app/page-header` vs `components/marketing/marketing-page-header`; `ui/stat` vs `app/stat-row`; `ui/empty` vs `app/empty-state`.
- Clutter candidates: 21 files in `components/marketing` (bento-*, redaction-demo, quote-check, review-schedule, hero-video, landing-sections 199 lines, bento-section 195), `how-it-works/page.tsx` (264 lines), decorative sprites (`components/art/sprite.tsx`, `public/art/*`), dashboard and progress sections (`dashboard-view`, `card-anatomy`, `whats-this`, `progress-view` with answers-chart, explained-owned-bars, ownership-meter).
- Motion: `motion` only in `components/marketing/*` and `hooks/use-loop-step.ts` (DECISIONS.md:239-242, which also records the scroll-reveal ban). No view transitions yet. The Next docs at `apps/web/node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` confirm that `import { ViewTransition } from 'react'` works in the App Router with no config on React 19.3.
- Tests: `apps/web/playwright.config.ts` (port 3200, local Supabase, fake model) with specs in `apps/web/e2e/` (answer-first, defend, full-flow, ownership, review). Unit tests run with `node --test`. There is no visual regression tooling.
</context>

<inputs>
Nothing open. Decisions taken with Zia on 2026-11-06:
- Scope: signed-in app, auth pages and marketing pages.
- Scroll reveals: allowed on marketing pages only, built with `motion` and `MotionConfig reducedMotion="user"`. Record the reversal of the ban in `docs/DECISIONS.md`. The signed-in app and auth stay free of scroll reveals.
- Fonts: Mona Sans for UI and headings, Geist Mono for code. Drop Geist Sans and Instrument Serif.
- `/design-system` and `/canvas`: keep both. They restyle through tokens; touch them only to fix breakage.

Defaults taken:

- Use the serveros palette mapped onto the existing semantic tokens (`--surface-*`, text, border, accent). Do not add a parallel token set. Derive the dark theme from the same hues: keep the accent and hairline borders, and invert the surfaces.
- Keep all copy, data contracts, routes and server behaviour unchanged unless a cut removes the whole element. This is a visual and structural redesign, not a feature change.
- Route transitions use React `<ViewTransition>` plus CSS in `theme.css`. They do not use `motion`.
- Keep the existing sound layer (`components/sound`) as it is.
</inputs>

<direction>
Make each page answer one question at a glance. For every page, write down its one job in a single sentence (for example "dashboard: what should I do next?"). Then keep only the elements that serve that job. Move or delete everything else. Explanations, "what's this" panels, duplicate stats and decorative sprites go first. When you are unsure whether an element is useful, check whether an e2e spec or a server action depends on it. Elements that nothing depends on and that do not serve the page's job are cut. List every cut in the PR body so Zia can veto any of them.

Copy the reference's restraint, not its product. That means one accent colour, hairlines instead of shadows, small radii, a large, tight headline with a muted second line, one primary action per view, and generous whitespace. A screen with fewer, larger elements beats a dense one.

Motion has a job or it goes. Use the emil-design-eng rules:

- Entrances use ease-out, under 300ms in the app.
- Hover colour changes take about 150ms.
- Presses scale to about 0.97 using `--dur-press`.
- Nothing animates on keyboard-driven actions or on high-frequency interactions.
- Everything respects `prefers-reduced-motion`; extend the existing reset in `tokens.css` and `globals.css`.

Add the new durations and easings as tokens in `tokens.css` and use them through `duration-(--dur-*)` and `ease-(--ease-*)`. Raw `duration-<n>` or arbitrary cubic-beziers in class names are not allowed.

Route life, in this order:

1. A short crossfade with a slight blur and lift on every route change inside each layout, using `<ViewTransition>`.
2. Directional slides in the app where navigation has an order, such as review card to next card, with `addTransitionType`.
3. Shared-element morphs where the same thing appears on two routes, such as a session row to the session page header, using a named `<ViewTransition name>`.
4. Suspense reveals: skeleton fades into content.

Marketing pages may add blur-in scroll reveals and the floating pill nav with `motion`.

Stack rules that apply here:

- shadcn/ui with `@shadcn/lint`. A new look is a `cva` variant in `components/ui/<name>.tsx`, never a `className` override at the call site.
- Theme tokens only. No raw colours, no arbitrary values outside `components/ui/`, no inline styles.
- No barrel files.
- `nuqs` for any URL state you touch.
- Server components first.
- Before using any Next.js API, read the matching doc in `apps/web/node_modules/next/dist/docs/`.
- Use the skills while working: `/better-ui` and `/emil-design-eng` for polish and motion values, `/transitions-dev` or `/web-animation-design` for specific transitions, `/better-accessibility` before calling a lane done.
</direction>

<structure>
M0. Baseline: capture screenshots of every route at 1440x900 and 375x812, in light and dark, with Playwright against the e2e setup (signed-in where needed). Save them to the session scratchpad, not the repo. Write the one-sentence job for each page into `docs/design/serveros-redesign.md`. Result: the baseline image set exists, and the doc lists every route with its job and its planned cuts.
M1. Phase 0 foundation: tokens, fonts, base styles, `components/ui` variants, the view-transition CSS recipes, and the component dedupe. Result: the app builds, every page renders in the new type and colour, and `pnpm typecheck && pnpm lint` passes.
M2. Lanes A-D in parallel: per-area restructure, cuts and motion. Result: each lane's verify command passes and the lane has after-screenshots.
M3. Integration: merge, full checks, a reduced-motion pass, an accessibility pass, and a review. Result: every acceptance check passes, and the PR is open with before/after screenshots and the list of cuts.
</structure>

<lanes>
Phase 0 (main session, sequential, before any lane starts):
owns `apps/web/src/styles/*.css`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/ui/**`, `docs/design/serveros-redesign.md`, `docs/DECISIONS.md`.
Tasks:
- Map the serveros values onto the existing tokens (light and dark). Add the motion tokens: entrance easing `cubic-bezier(0.32, 0.72, 0, 1)`, out-expo `cubic-bezier(0.16, 1, 0.3, 1)`, hover 150ms, route 220ms.
- Swap the fonts to Mona Sans plus Geist Mono.
- Restyle the `components/ui` primitives: button heights 32/36, radius 6-7, flat hairline cards.
- Add the `::view-transition-*` recipes (fade-blur, slide-forward, slide-back, morph) to `theme.css` with reduced-motion fallbacks.
- Check the suspected duplicates (page-header, stat, empty-state). Done 2026-11-06: the `app/` versions compose the `ui/` primitives, so nothing is merged.
- Write the DECISIONS.md entries: scroll reveals allowed on marketing only, the font change, and view transitions for routes.
Verify: `pnpm typecheck && pnpm lint && pnpm --filter web test`. Commit, and branch the lane worktrees from this commit.

Lane A, app shell, dashboard and sessions (worktree):
owns `apps/web/src/app/(app)/layout.tsx`, `(app)/app-breadcrumb.tsx`, `(app)/error.tsx`, `(app)/not-found.tsx`, `(app)/dashboard/**`, `(app)/s/**`, `apps/web/src/components/{app-sidebar,nav-main,nav-sessions,nav-user,nav-items,brand-mark}.tsx`, `apps/web/src/components/{app,dashboard,sessions,cards,projects,report}/**`.
Tasks:

- Simplify the sidebar and topbar.
- Wrap the `(app)` content in `<ViewTransition>`.
- Cut the dashboard down to "what next".
- Morph a session row into the session page header.
- Add `loading.tsx` skeletons where data loads.
  Verify: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web exec playwright test e2e/full-flow.spec.ts e2e/ownership.spec.ts`.
  STOP if a cut would remove an element an e2e spec asserts on. Report it instead of editing the spec.

Lane B, learning routes (worktree):
owns `apps/web/src/app/(app)/{review,progress,defend,tracker,settings,setup,cli}/**`, `apps/web/src/components/{review,progress,defend,settings,setup,cli}/**`.
Tasks:

- Give each route one job.
- Add directional slides between review cards using `addTransitionType`.
- Simplify progress to the one chart that answers "am I improving?".
- Flatten settings and setup into plain sections.
  Verify: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web exec playwright test e2e/review.spec.ts e2e/answer-first.spec.ts e2e/defend.spec.ts`.
  STOP if a change needs a server action, schema or `packages/shared` change.

Lane C, marketing (worktree):
owns `apps/web/src/app/(marketing)/**`, `apps/web/src/components/marketing/**`, `apps/web/src/components/art/**`, `apps/web/src/hooks/use-loop-step.ts`, `apps/web/public/art/**`, `apps/web/public/video/**`.
Tasks:

- Rebuild the landing page with the structure of https://egm.dev/ (Zia asked for it on 2026-11-06 as "to the point"), styled like serveros. That means a centred hero (a two-line headline, a paragraph of three lines at most, one primary button, a screenshot of the real dashboard), then four short sections (loop tiles, one card, trust list, install command with "Get started"), about four screens tall. Follow `docs/design/serveros-redesign.md`.
- Cut the bento and demo widgets that repeat a claim.
- Shorten how-it-works.
- Add the floating pill nav on scroll.
- Add blur-in scroll reveals with `motion`.
- Wrap the marketing content in `<ViewTransition>`.
- Delete art and video files that nothing references any more.
  Verify: `pnpm --filter web typecheck && pnpm --filter web lint && rg -n "from \"motion" apps/web/src --glob '!**/marketing/**' --glob '!**/use-loop-step.ts'` (expect no output).
  STOP if a deleted asset is still referenced outside this lane.

Lane D, auth and errors (worktree):
owns `apps/web/src/app/(auth)/**`, `apps/web/src/app/auth/**`, `apps/web/src/components/{auth,errors}/**`.
Tasks:

- Make auth pages a centred single card in the new style: one heading, a muted line, the form, one primary button.
- Remove decorative auth scene art unless it carries meaning.
- Wrap the auth content in `<ViewTransition>`, so login and sign-up crossfade.
- Restyle the error pages.
  Verify: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web exec playwright test e2e/full-flow.spec.ts`.
  STOP if a change touches `actions.ts` behaviour.

Integration (main session): merge A, then B, then C, then D. After each merge run `pnpm typecheck && pnpm lint && pnpm test`. After the last merge run the full acceptance list. Then do a reduced-motion pass (emulate `prefers-reduced-motion: reduce`), `/better-accessibility` and `/zia-review branch`, and fix their findings.
</lanes>

<acceptance>
1. `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test` exits 0 on the final branch head.
2. `pnpm test:e2e` passes all five specs (answer-first, defend, full-flow, ownership, review) against local Supabase.
3. `rg -n "Geist\(|Instrument_Serif" apps/web/src` returns nothing, and `apps/web/src/app/layout.tsx` loads `Mona_Sans` and `Geist_Mono`.
4. `rg -n "duration-[0-9]|ease-\[|cubic-bezier" apps/web/src --glob '!**/styles/**' --glob '!**/components/ui/**'` returns nothing (motion values come from tokens).
5. `rg -n "from \"motion" apps/web/src --glob '!**/marketing/**' --glob '!**/use-loop-step.ts'` returns nothing.
6. `rg -ln "ViewTransition" apps/web/src/app` lists the `(app)`, `(auth)` and `(marketing)` layouts (or their content wrappers), and `theme.css` contains `::view-transition` rules with a `prefers-reduced-motion` override.
7. No parallel implementations: `components/app/page-header`, `app/stat-row` and `app/empty-state` compose the `components/ui` primitives (they import from `@/components/ui/page-header`, `ui/stat` and `ui/empty`). Checked in Phase 0 on 2026-11-06; they are layers, not copies, so they stay (docs/DECISIONS.md).
8. Before and after screenshots of every route at 1440 and 375, in light and dark, are attached to the PR. No after-screenshot shows horizontal scroll at 375 px.
9. A recording or frame strip of one route change in the app, one review-card slide and one marketing scroll reveal shows the transition. With `prefers-reduced-motion: reduce` emulated, the same flows show no movement.
10. `docs/design/serveros-redesign.md` lists every route with its one-sentence job and its cuts, and the PR body repeats the cut list.
11. `docs/DECISIONS.md` has dated entries for the marketing scroll reveals, the font change and the route view transitions.
12. `/zia-review branch` on the touched lanes reports no open Blocking or Important findings.
Unresolved (only Zia can run this): check the transitions in Safari and Firefox by opening `pnpm dev`, then navigating dashboard to session to review. The `<ViewTransition>` animations may differ there or not run at all; the app must still work.
</acceptance>

<gotchas>
- `@shadcn/lint` rejects `className` restyles of `components/ui/*`. Add a variant in the component file. Its error message names the fix.
- `@shadcn/lint` only sees CSS imported through `globals.css`, so keep new CSS in the existing `src/styles/*.css` files.
- Next.js 16 differs from training data. Read the docs under `apps/web/node_modules/next/dist/docs/` first, especially `02-guides/view-transitions.md` and the `link.md` `transitionTypes` notes.
- `cacheComponents: true` and `partialPrefetching: true` are on in `next.config.ts`. Dynamic data must stay inside Suspense, or the build fails.
- `decision_cards.model_answer` is unreadable with the anon key. Select card columns by name and never `select *`, even when restructuring card views.
- `packages/shared` and `supabase/migrations` are shared contracts. This run changes neither.
- Phosphor icons need the `/ssr` import in server components.
- The dashboard and progress views have `*-sample.ts` mocks used by `/design-system`. Keep the mock shapes in sync when you change the props.
- The reduced-motion reset in `globals.css:26-57` targets `[data-slot]`. New animated elements outside shadcn parts need their own reduced-motion guard.
- Never read real env files, by any means.
</gotchas>

<limits>
Scope: `apps/web` UI only, plus `docs/design/serveros-redesign.md` and `docs/DECISIONS.md`. No server, schema, API or `packages/*` changes.
These need Zia's approval first: adding any dependency, pushing a branch, opening the PR, and merging. Merge only when Zia says so.
Session logs go in `.claude-logs/` per CLAUDE.md. Review and redact them before committing them separately.
Run limit: stop after M3 or after 3 sessions, whichever comes first. Write `progress.md` at each milestone.
</limits>

<start>
Confirm that the inputs above still hold. Then show the per-page job list from M0 and the lane ownership table, and wait for my go before Phase 0 writes code.
</start>
