# Decisions

Newest first. Each entry: what we decided, why, and what we rejected.

## 2026-11-02 · Empty states say why they are empty

- **Decision:** each empty state names its reason and the next step. The review queue tells a first run (`NoCardsYetEmpty`: no cards at all, set up the CLI) from all caught up (`AllCaughtUpEmpty`: cards exist, none due, with when the next one is due). `/progress` with no cards shows the same state. A learner with no card isn't always a first run, so `cardlessReason` (`lib/sessions/queries.ts`) picks the copy: no session yet (set up the CLI), one still being read (cards on the way), or sessions that gave none (each card needs a verified quote); cards with no answer yet still show `NoReviewsEmpty`. The dashboard, review and progress error boundaries share `LoadErrorState`, which shows `OfflineState` when the browser is offline and retries by itself when it reconnects. `emptyQueue` (`lib/review/queries.ts`) is the second read that tells them apart; it runs only when the queue comes back empty. A card never answered within 7 days of its session leaves the queue by design (`NEW_CARD_DAYS`, so a learner back from a break isn't handed the backlog), so a learner whose only cards are like that sees "All caught up" with "no review is scheduled", which says that card is still on its session's page and links to the sessions. `nextDue` counts only reviews of visible cards (an inner embed of `decision_cards`), so a hidden card never sets it.
- **Why:** the queue said "No cards due today" both to a learner who had never sent a session and to one who had finished today's reviews, and progress sent a first-run learner to that empty queue. Each reason has a different way out.
- **Rejected:** a no-access state for `/tracker`: a learner who isn't a member gets a 404 on purpose, so the page doesn't reveal itself. No-results and filtered-to-nothing: the app has no search or filters yet; `NoResultsEmpty` already exists for when it does.

## 2026-11-02 · The landing's demos loop in place, on motion.dev

- **Decision:** the landing gets a product bento under the hero (`components/marketing/bento-*.tsx`, layout and timing cloned from a reference video, spec in `.reanimate/bento/spec.md`, which is git-ignored) and one looping demo per section: the review schedule, the quote check, the secret filter. Idle micro motion (bell, bars, dot, caret) and the demos' springs and enter/exit swaps use `motion` (pinned 14.3.0, client components only). Simple transitions stay Tailwind. Every demo idles in place; none waits for a scroll. `MotionConfig reducedMotion="user"` drops transforms and `useLoopStep` stops the loops under reduced motion.
- **Why:** Zia asked for micro animations with motion.dev. Springs, keyframe loops and exit animations are a few lines with it and a lot of hand CSS without. The design system bans scroll reveals, so the motion runs on its own clock.
- **Rejected:** scroll-triggered entrances (banned); the reference's sliding tab pill (the segmented control cuts by design); a 3D glass asterisk (the watercolour cards sprite turns instead).

## 2026-11-02 · Measured skeletons with skullet on the dashboard, review, session and progress pages

- **Decision:** the dashboard's session list, the review queue, a session's cards (`/s/[id]`), the quiz (`/review/[cardId]`) and `/progress` load behind a skullet skeleton (`skullet@0.0.3`). The skeleton is the real component rendered from sample rows, measured into bars, so each row's skeleton is the shape of a real row. The row count is a representative sample (4 sessions, 3 queue cards, 2 decision cards, 3 sessions on /progress), not the real count. No boundary knows the count, the dashboard's due banner or its page links before the query returns, so the list can still grow or shrink when the data lands, as it did with the old fixed 4-row skeleton. A learner with nothing yet (no sessions, no cards due, no answers) sees the populated skeleton give way to the empty state; `main` did the same with its fixed skeletons, and whether a learner is empty is only known after the query. `SkulletProvider` in the root layout points skullet at the design system's skeleton tokens: `--surface-skeleton` fill, `--radius-soft`, pulse. Static headings carry `skullet-own` so they stay real text, as the hand-built skeletons had them.
- **Why:** the hand-built `SessionListLoading` drew fixed `h-4` boxes. They didn't match a row's real height or text widths, and the review page reused the session-list skeleton for a list with a different shape. With skullet the skeleton follows the component, so it can't drift when a row changes. Holding the count too would mean reading it ahead of the rows.
- **Workarounds for 0.0.3 bugs:** skullet sets `-webkit-text-fill-color: transparent` on the loading root. That property inherits, so it also hides text inside `skullet-own`; `globals.css` sets it back to `currentColor` there. Skullet also counts Tailwind's `shadow-none` (five transparent zero shadows) as a surface. A card header holding one line of text then draws as a single block. `card.tsx` sets a list card's header to a plain `box-shadow: none` instead, which renders the same (pixel-identical page) and draws the decision card's title as a bar. `skullet-own` text that inherits its colour also needs its own colour class, because skullet sets `color: transparent !important` on everything it draws; `/progress` gives its header spans `text-text-1` and `text-text-2`.
- **No shape memory:** the pages use `MeasuredSuspense` (`components/app/measured-suspense.tsx`), a plain `Suspense` whose fallback is skullet's `<Skeleton loading>` over the sample view, not skullet's own `SkeletonSuspense`. `SkeletonSuspense` always keeps a copy of the loaded content in `localStorage["skullet:shapes"]` (`id` or not; no opt-out up to 0.0.3) and saves it again 250 ms after every change. Its mask replaces only ASCII letters and digits, so non-ASCII text stays readable, and attributes stay, so `href`s with the learner's card and session ids are kept. On the quiz that copy would include the model answer after grading. RLS doesn't guard localStorage: same-origin scripts and extensions can read it, and skullet replays it as the next account's skeleton. A `loading` Skeleton only measures what it is given; skullet's memory is created only around revealed content, so the real data never reaches it (checked: `localStorage` stays empty across all five pages). The cost is skullet's reveal animation: the content replaces the skeleton without a crossfade. `ForgetShapes` (`components/auth/forget-shapes.tsx`) still clears skullet's store on every signed-out screen (the signed-out marketing nav, where every sign-out lands, and the auth layout), for shapes an earlier build of this branch saved.
- **Rejected:** fixing the hand-built skeletons by hand. Each would need re-measuring whenever its component changes. Skullet's `SkeletonSuspense` with `ForgetShapes` as the only guard: clearing at sign-out doesn't stop a script reading the copy while the learner is signed in.
- **Revisit when:** skullet passes 0.1 (drop both workarounds if they're fixed upstream), or when more pages move off `loading-state.tsx`. The settings, setup (`TokenSectionLoading`) and tracker skeletons are still hand-built; `DecisionCardLoading`, `ReviewCardLoading` and `StatRowLoading` remain only as design-system specimens.

## 2026-11-02 · The CLI ships as one bundled file, as the unscoped npm package `session-coach`

- **Decision:** `packages/cli` is named `session-coach` (version 0.1.0, MIT) and publishes only `dist/cli.js`, `README.md`, `LICENSE` and `package.json`. `esbuild` (pinned 0.28.2) bundles our code and `@session-coach/shared/redact` into that one ESM file for Node 20+; only `node:` builtins stay external, so `@session-coach/shared` is a devDependency and no workspace import is left at runtime. `prepack` runs the build. The root private package is renamed `session-coach-monorepo`.
- **Why:** `npx session-coach` is the install the setup page promises; the shared package is not on npm, so it has to be inside the file. Two workspace packages named `session-coach` made `pnpm --filter session-coach` match both, so the root changed (agreed with Zia).
- **Rejected:** publishing `@session-coach/shared` too (a second public package and contract to keep in step); a scoped name (the setup page already shows `npx session-coach`). **Not published yet:** the PR publishes right after merge; until then `npx session-coach` will not resolve.

## 2026-11-02 · The CLI redacts before upload

- **Decision:** `redact.ts` moved to `packages/shared` (`@session-coach/shared/redact`). `push` redacts before gzip: each line is parsed, its string values (not keys) are redacted, and it is serialized again, so a JSON line stays JSON. A line that doesn't parse is kept in place and redacted as plain text.
- **Why:** the setup page says secrets are redacted on the laptop. Running the rules over raw JSON text could break escapes; per-line parsing can't.
- **Structural fields** are exempt only at known structural locations, to preserve the log's structure (a uuid matched the long-token rule). The parser itself needs only the `tool_use` block's `id` and the `tool_result`'s `tool_use_id`, to link calls to results; it does not need the others. The fields: the event's top level (`uuid`, `parentUuid`, `sessionId`, `requestId`, `timestamp`, `type`); `event.message` (`id`, `role`, `type`); and the items of `event.message.content` when it is an array (`type`, plus `id` on a `tool_use` block and `tool_use_id` on a `tool_result` block). Every other string value is passed through the redactor at every depth, including a `tool_use` block's whole `input`, a `tool_result`'s `content` and any `toolUseResult`.
- **Rejected:** regexes over the raw text (can corrupt a line); exempting these key names at any depth (a secret under an `id` or `type` key inside a tool input would go through unredacted). **Trade-off:** the log is decoded as UTF-8, so an invalid byte now arrives as U+FFFD.
- **Numbers** go through `JSON.parse`, so integers above 2^53 lose precision; the server parser has the same limit, so nothing downstream changes.

## 2026-11-01 · Big sessions: stay on the Groq free tier, send only the last ~9k characters

- **Decision:** extraction stays on the Groq free tier (`MODEL_PROVIDER=groq`, `openai/gpt-oss-120b`), no paid plan. Every call has to fit the free tier's 8,000 tokens/minute, so the timeline sent to the model is cut to its **last 9,000 characters** (about 3,000 input tokens at the measured ~3 characters per token). The one retry adds the failed answer (about 1,000 tokens), so it sends about 4,000; either call leaves about 4,000 tokens of the minute for the answer and reasoning. Older events are dropped whole, newest kept, because the end of a session usually holds the decisions that shipped. If the newest event alone is over 9,000 characters (a long Bash command, which the parser keeps whole), it is cut to its first 9,000 characters and sent alone, so a call never goes over budget. The existing 60-second wait before the retry keeps it in a fresh minute. Follow-up code (not done yet): the 9,000-character cut before `extractCards`, replacing the planned 150,000; and cutting long Bash commands in the parser, so more events fit in the budget.
- **Why:** measured offline on 3 of Zia's own Claude Code sessions on this repo. Each log ran through the extraction branch's `parseSession` (with `redact`; Read results dropped, tool results cut to `RESULT_MAX_CHARS` = 500). The request was built as `extractCards` builds it (`EXTRACT_INSTRUCTIONS` + `{ events }` JSON) and tokens were counted with `js-tiktoken` `o200k_base` (the base of gpt-oss's o200k_harmony), plus about 60 tokens for message wrappers. Nothing was sent to any provider. A request over the free tier's 8,000 tokens/minute can't fit in any minute, so the medium session fails on the first call, not only on the retry.

  | Session                  | Raw log | Events kept | Characters sent | Prompt tokens | Retry call tokens | Fits free tier (8K TPM) |
  | ------------------------ | ------- | ----------- | --------------- | ------------- | ----------------- | ----------------------- |
  | Small                    | 0.87 MB | 9           | 8,380           | 2,284         | 3,263             | Yes                     |
  | Medium                   | 15.4 MB | 229         | 108,366         | 35,476        | 36,455            | No (4.4x)               |
  | Large                    | 56.1 MB | 2,187       | 1,144,300       | 333,499       | 334,478           | No; over 131K context   |
  | Large, cut to 150k chars | 56.1 MB | 423         | 151,950         | 44,047        | 45,026            | No (5.5x)               |
  - **Output:** a 5-card answer is about 930 tokens of JSON. gpt-oss also spends reasoning tokens (default effort `medium`), not measured here; budget 2,000 to 4,000 output tokens per call.
  - **Worst case per session on the free tier:** about 3,000 input tokens plus up to 4,000 output on the first call, and about 4,000 plus 4,000 on a retry: about 7,000 to 15,000 tokens, one call per minute. The 200,000 tokens/day cap then allows roughly 13 to 28 extractions a day, shared with grading (one grading call is about 1,000 to 2,000 tokens). Enough for the trial; not for V2.
  - **The cost of the cut:** for the medium session, 9,000 characters is about the last 8% of what would otherwise be sent; for the large one, under 1%. Cards come only from the end of a long session.
  - **Where the characters go:** shell commands are the biggest kind (57k of 95k text characters in the medium session, 469k of 1.03M in the large one), because the parser keeps a Bash command whole (heredocs, PR bodies). Cutting commands to 200 characters still leaves the medium session at 19,415 tokens, so trimming alone can't reach 8K.
  - **Limits read 1 Nov 2026** at https://console.groq.com/docs/rate-limits for `openai/gpt-oss-120b`: free plan 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, 200,000 tokens/day; developer plan 1,000 requests/minute, 500,000 requests/day, 250,000 tokens/minute, no tokens/day limit listed. Uncut, free tokens/day would allow at most 5 medium sessions a day (200,000 / 35,476 first-call tokens); a schema retry adds about 36,455 more, and grading draws on the same quota, so the real number is lower.
  - **Price read 1 Nov 2026** at https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints: the Groq endpoint is $0.15 in / $0.60 out per million tokens; OpenRouter's cheapest endpoint is $0.017 / $0.063; the context is 131,072 tokens on most endpoints. One capped large session with a retry costs about $0.02 on Groq pricing.

- **Rejected:** the Groq developer (paid) tier: it fits even a 150,000-character cut of the large session in one minute (about 95,000 tokens with a retry, about $0.02), but Zia prefers no paid plan for the trial. Failing sessions over a cap instead of cutting them: only the small session fits, so most real sessions would fail in the demo. (c) Splitting the timeline at user prompts and extracting per chunk: under 8K per call, the medium session needs about 10 calls and the large one about 77 (23 of 79 prompt segments are larger than one call on their own). At 8K tokens/minute that is 10 to 77 minutes per session, plus merge-and-rank code. OpenRouter as the main choice: it works as config, but it adds a second key and provider routing we haven't tested, and grading would stay on Groq's free quota unless it moves too.
- **Not verified:** reasoning token counts (needs a real call); whether Groq bills the free 8K limit on input only or on input plus `max_tokens` (the docs describe one combined TPM cap); the Groq price on groq.com itself (read from OpenRouter's Groq endpoint instead); whether 9,000 characters still yields 3 to 5 grounded cards on a long session (check in the accuracy run on 5 real sessions).
- **Revisit when:** the accuracy check shows long sessions losing their important decisions, or V2 adds teams and more users. Then switch to the developer tier (config and billing only), raise the cut, move grading and extraction to separate keys or models so one can't starve the other, add the split-at-prompts path for sessions over the cap instead of dropping their start, and cut long Bash commands in the parser the way tool results are cut.

## 2026-11-01 · Timeline trim budget, and cards before `ready`

- **Decision:** before extraction each event's text is cut to 1,500 characters (the start is kept), then events are kept in order until 16,000 characters are used; the rest are counted as `cut_events` and logged. `processSession` inserts all cards in one call and sets `ready` only after that insert succeeds.
- **Why:** Groq's free tier allows 8,000 tokens per minute, and the instructions and the retry share that window. The per-event cap stops one huge event eating the budget; ids stay intact. Insert-then-ready means a crash in between leaves `failed`, never a `ready` session with no cards.
- **Not aligned yet:** #32 chose to send the LAST ~9,000 characters (newest events kept); this keeps the FIRST 16,000 with each event capped at 1,500. Align in a follow-up (event ids must stay consistent between the cut timeline, `extractCards` and `checkEvidence`).
- **No delete on re-run:** deleting a session's cards would cascade to answers and reviews. No code path re-processes a failed session yet; when Zia adds a retry transition, it must clear cards safely.
- **Known gaps:** insert and `ready` are separate writes (a transaction needs an RPC migration), and a platform kill leaves a session in `processing` (needs a sweep in a cron).

## 2026-10-31 · Groq as temporary extraction backup, and prompt v2

- **Decision:** extraction runs on Groq `openai/gpt-oss-120b`, set through env only (`MODEL_PROVIDER`, `MODEL_EXTRACT`), with no code change. This is temporary. Gemini 3.8 Flash stays the target (#22) until a model comparison on the golden set. Zia agreed.
- **Why:** the `gemini-3.8-flash` free tier returned 503 or hung all day. A plain curl with a tiny prompt failed the same way while the model list returned 200, so the fault is not our code. Many forum reports have said the same since early October.
- **Limit:** the Groq free tier lists 8,000 tokens per minute, so large sessions may not fit.
- **First real run (one session, Groq):** 5 cards, 4 of 5 quotes verified, 3 `stated` cards downgraded to `inferred`. Hand check: 1 of 5 was a real decision; the rest were file writes, a deletion and a test result. One session only. Prompt v2 is the response: a decision needs two real options, one quote must state the choice or reason in words (a file write or shell command does not count), a card with no such quote is `inferred`, and zero cards is a valid answer (later replaced: Zia chose 3 to 5, see the extraction entry).
- **Rejected:** waiting for Gemini to recover (blocks Monday's demo); paying for Gemini billing (a forum poster doubted it fixes the 503s, and it costs money); `gemini-2.5-flash` (the API said it is closed to new users, 404).
- **Known gap:** `stated` is kept when a verified quote comes from a prompt or reply, even if the quote has no reason in it.

## 2026-10-31 · Extraction: card count, the stated rule, retry, file and lines

- **Decision:** Zia chose 3 to 5 decisions from the model (top key `decisions`, evidence `{ event: "E2", quote }`; code turns `E2` into `event_index` 2). Code, not the prompt, drops every card with no grounded quote: a verified quote from a prompt, a reply, or a write or edit of a file named `DECISIONS.md`. A quote counts as verified only if it has at least 5 words after whitespace is collapsed (`MIN_QUOTE_WORDS`, matching the prompt's "5 to 30 words"); a shorter quote is `verified: false` even when it appears in the event, so it can't ground a card. This is checked in `evidence.ts`, not the schema, so one short quote doesn't fail the whole model answer. A session can end with 0 cards. A session with 0 to 2 surviving cards should still be `ready` (agreed with Zia; planned, to be done in `processSession` in the next PR, not done yet). `position` is set after the drops (0, 1, 2...). `files` keeps only paths that some write or edit event wrote, matched by suffix (equal, or ends with `/` + the path), because the model writes relative paths. An answer that fails the zod schema (including fewer than 3 or more than 5 decisions) gets one more call with the validation error in `data`; a second failure throws. `evidence.file` is filled by code from write and edit events (the path before `—`), never by the model; `lines` is `null` in v1.
- **Why:** the guide asks for 3 to 5, and the prompt can't enforce that a quote is real, so code drops what it can't ground. `source` is the model's label: every kept card is grounded, so `stated` means the model says the reason was written and a grounded quote verified. Code does not yet check that the quote contains the reason (known gap below). Grounding uses only quotes that exist in the timeline. One retry with the error fixes most formatting slips without looping on a model that can't comply. The model can't see line numbers in the timeline, so a file path it wrote would be a guess, and lines would be too.
- **Rejected:** letting the model return fewer than 3 or 0 decisions; keeping ungrounded cards as `inferred`; more than one retry; letting the model fill `file` or `lines`.
- **Known gap:** `stated` is the model's label. Code checks that a grounded quote exists, not that the quote contains the reason.
- **Known gap:** a padded card that quotes a reply still passes, because a reply is a grounded source even when it holds no reason.
- **Known gap:** a `stated` reason quoted from a `DECISIONS.md` write rarely verifies yet. The parser keeps only the path and line count of a write, and a 60-character preview of an edit, so the reason text is usually not in the event. The basename rule stays; it starts to matter when the parser keeps more of those events.
- **Supersedes part of 2026-10-28 (`flagged` and `hidden`):** ungrounded cards are now dropped before storing instead of kept as hidden rows, so `hidden` is never true for cards from this check (every kept card has a verified quote); `flagged` can still be true. The accuracy check reads the runner's `DROPPED:` lines (each with its quotes, ✓/✗ and event kind) instead of hidden rows.
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

- **Decision:** parser output is redacted before storing: API keys/tokens (JWTs, `sk-`, `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`, `AIza`, Bearer, Basic auth) and long letters+digits strings → [REDACTED]; `NAME=value` where NAME contains KEY, TOKEN, SECRET, PASSWORD or PASSWD → `NAME=[REDACTED]` (value is a quoted string or a run of non-space characters); emails → [EMAIL]; /Users/<name>/ and /home/<name>/ → ~/ (the name stops at shell operators, so `cd /Users/jane&&pnpm test` keeps its command). Hex runs of exactly 40 or 64 characters are left intact. Read paths get only the home-path rule so the path structure stays.
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
