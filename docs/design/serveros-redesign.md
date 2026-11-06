# Serveros-style redesign: page jobs and cuts

The brief is in `prompts/001-serveros-style-redesign.md`. Every page gets one job, written as the question it answers. An element stays only if it serves that job or an e2e spec depends on it.

"Keep (e2e)" marks text or controls that specs assert on. Their names and roles stay exactly as they are. "Cut" means delete. "Move" means the element goes to the page where it does serve the job. Zia can veto any cut in the PR.

## App shell

Job: get to any page in one click and always know where you are.

- Keep: brand link, the nav (Dashboard, Review with its due badge, Defend it, Progress, Setup, Settings), the sessions list, the account menu.
- Move: the theme toggle goes into the account menu, so the sidebar footer holds one control.
- Cut: the topbar breadcrumb's "Session Coach" root crumb. The sidebar already names the app; the topbar keeps the trigger and the current page title.
- Motion: the page content crossfades with a slight lift and blur on each route change through `<ViewTransition>`. The sidebar never animates on navigation.

## /dashboard

Job: what should I do next?

- Keep (e2e): the "Dashboard" heading, the project tabs (nav "Projects"), the due block with "Start review" and its "Done for today" and "All caught up" states, the ownership heading "Explained N · owned N of N" with per-project lines, the "Sessions" card with its rows and pager.
- Keep: ProjectSetup when a repo needs a level (FF asserts its heading, "Hard" and "Save"). Keep FirstSessionEmpty on the first visit.
- Cut: the CardAnatomy rail ("Inside a decision card"). It explains a card instead of showing one. The how-it-works page already covers it.
- Cut: the three "What's this" disclosures in the due, ownership and sessions blocks. Move each one-line answer into the block's description text instead.
- Cut: the step badges on due rows. The review queue shows them; here the decision and question are enough.
- Layout: one column. The due block comes first as the hero (large count, one primary button), then ownership, then sessions.

## /review

Job: start today's review.

- Keep (e2e): "Start review", the queue rows, and the empty states ("Done for today" and the others).
- Cut: the description sentence "Up to 5 a day..." becomes a single muted line under the heading, not a second card header.
- Motion: none beyond the route transition.

## /review/[cardId]

Job: answer this one question.

- Keep (e2e): the question heading, "Your explanation", "Submit answer", "I don't know yet", "Your result" and "Here's the why", the "Explained" score text, the why text and the evidence.
- Keep: the "From <session>" link.
- Cut: nothing functional. Restyle the result's DataList as a flat list with hairline dividers.
- Motion: when the next card loads, the card slides left; going back slides it right (`addTransitionType`). The result block fades in over the question card.

## /s/[id]

Job: what did this session decide?

- Keep: title, repo and branch, status, the decision card list, and the failed, processing and empty states.
- Cut: the Started stat. Duration and Cards stay; the start time moves into the duration's detail line ("min · started 2 hours ago").
- Motion: the route crossfade only. A row-to-title morph was built and removed in review: the title loads inside Suspense, so the shared pair rarely formed, and toggling the name remounted the sidebar link and dropped focus.

## /progress

Job: am I making these decisions mine?

- Keep (e2e): the "Progress" heading, the project tabs, "From all your projects.", the summary line "N cards · N explained · N owned", the "By project" heading and the "By session" list.
- Cut: the CardPathCard ("How a card becomes yours"). It is explainer content; the step names already appear in the summary stats.
- Cut: ExplainedOwnedBars. It repeats the summary line as a chart. Keep AnswersChart as the one chart.
- Cut: the TodayBanner's "Start review" duplicate. Keep the banner text (e2e) and link to /review once.
- Layout: the summary line as the hero, then one chart, then By project, then By session.

## /defend

Job: prove you can defend one decision under time.

- Keep (e2e): everything the defend spec asserts (heading, start button, question, clock, "Your answer", paste-off hint, "Send", "2 of 2 · follow-up", "Finish", the result text).
- Cut: the rules list shrinks to three short lines. The current list repeats what the timed step already shows.

## /settings

Job: change my profile, devices or account.

- Keep: the profile form, question level per project, devices (FF asserts "No computer connected yet", "Revoke" and its dialog), share your report, sign out everywhere, delete account.
- Cut: the step numbers 1-6. Settings are not a sequence. Each becomes a plain section with a heading.
- Cut: "Saves steps 1 to 3." The Save button sits inside the profile section, so its scope is visible.

## /setup

Job: connect my computer so sessions upload.

- Keep (e2e): "Connected devices", the create-token dialog, the device rows with "Revoke", and "No computer connected yet".
- Keep: "Let your AI do it" as the primary path and "Do it step by step" as the fallback.
- Cut: step 4 "What happens next". It is not a step; one sentence after step 3 covers it.
- Move: "What a push uploads" becomes one muted line with the privacy link under the steps, not its own card.

## /tracker

Job: what is left to ship (members only).

- Keep everything. It is an internal tool; it only restyles through tokens.

## /cli/approve

Job: approve this terminal login.

- Keep (e2e): "Is this the code in your terminal?", "Approve", "CLI connected", and every notice state.
- Cut: nothing. Restyle as a centred single card like auth.

## Marketing layout

Job: get a visitor to sign up or understand the product.

- Nav: a plain row at the top that becomes a floating, bordered pill after scrolling (motion, marketing only). Links stay: How it works, Pricing, Support, account control.
- Footer: tagline and links stay. Cut the FooterScene art.

## / (landing)

Job: say what Session Coach does and get the visitor to "Get started".

Structure follows https://egm.dev/ (Zia, 2026-11-06: "to the point"): a centred hero and then four short sections, about four screens tall in total. The visual style (type, colour, radius, motion) still follows serveros.com.

- Hero, centred: a two-line headline of about 65px (statement, then the contrast line), one paragraph of three lines at most in a 640px column, one primary "Get started" button and the trial note. "See how it works" becomes a quiet text link. A screenshot of the real dashboard in a browser frame sits below. Cut the hand underline. The hero video is replaced by the dashboard screenshot unless the video carries more information.
- Then four sections, each a heading plus a short grid or list, with blur-in scroll reveals:
  1. LoopSection: the four steps as four small tiles in a row (title plus one line each).
  2. CardSection: one real decision card.
  3. TrustSection: what is uploaded and what is redacted, as a short list. It is the one inverted section.
  4. ClosingSection: the install command (`npx session-coach@latest login`) with a copy button, plus "Get started".
- Cut: BentoSection. Its tiles repeat claims from the loop and card sections. Delete the bento components and any demo widget they alone use.
- Cut: FooterScene art and the sprites used only on the landing page.

## /how-it-works

Job: explain the loop in more depth than the landing page.

- Keep: the steps, "What a card can be", "Your progress, by project".
- Cut: repeated intros. Each step gets one heading and at most two sentences.

## /pricing, /support, /privacy, /terms, /delete-account

Job: answer one question each.

- Keep all content. Restyle only: a large tight heading, a muted line, then the content in a 640px column.

## Auth (/login, /sign-up, /forgot-password, /update-password, /sign-up/check-email, /auth/*)

Job: get signed in.

- Keep (e2e): "Email", "Password", "Sign in", the Google button and the switch links.
- Layout: a centred single column with the brand link, a heading, a muted line, the form and one primary button.
- Cut: the right-hand RouteAuthArt column and ForgetShapes, unless they carry meaning (they are decorative).
- Motion: login and sign-up crossfade through `<ViewTransition>`.

## /design-system, /canvas

Job: document the components (internal).

- Keep both. They restyle through tokens; touch them only to fix breakage from the dedupe or removed components.
