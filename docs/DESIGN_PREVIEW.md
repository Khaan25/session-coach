# Local design preview

Run `pnpm dev:design` from the repository root. This starts the website at http://localhost:3100 and an isolated fixture adapter on 127.0.0.1:54329. Open http://localhost:54329/preview to enter the dashboard.

The **Design preview** button at the bottom right switches between the website, authenticated pages, empty and failed states, authentication screens, and the upstream ideas canvas. Its navigator is rendered only in development with `DESIGN_PREVIEW=1`; normal `pnpm dev` and production builds do not enable it.

All rows and the preview identity are synthetic. No real Supabase project, email, session files, model API, or account is connected. Answering a card uses the repository’s existing deterministic fake grader. Supported changes live only in memory and reset when the preview restarts, or when **Reset sample workspace** is selected. Account deletion, token creation/revocation, uploads, and other unsupported writes remain unavailable.

## Project views

Dashboard, Review and Progress share a Project selector. Choose Rapporteur or Session Coach to see only that project’s sessions, decisions and learning record; links and next-card navigation retain the scope. All projects combines them. The fixture starts with 1 owned decision out of 3 for Rapporteur and 0 out of 3 for Session Coach. Explained counts unique decisions ever answered correctly; owned counts completed review ladders. Thirty-day answer activity counts attempts separately.

The preview menu includes direct project-progress links. The daily five-answer allowance is shared across projects. No migration, live model call or real account is needed.

## Updated product flows

- **Session · answered and locked** includes answered cards with evidence and an unanswered card whose why and evidence remain absent until an attempt. The adapter projects requested columns and models the review relationship used by the real server.
- **Explain a card** opens an existing due card. **First attempt** opens card `55555555-5555-4555-8555-000000000002`, which has no review yet. Both answer submission and “I don’t know yet” run through the unchanged application API. Skips count toward the same daily cap. Sample answer history starts yesterday, leaving all five attempts available after reset.
- **Settings · project levels** shows two projects. Changes to simple, hard, and complex persist in memory. **Project onboarding** clears the sample projects’ onboarding state so their first-time prompts can be inspected and saved.
- **Setup** shows two synthetic connected computers. **No connected devices** shows the empty state without removing the sample learning history.
- **Approve a device** opens `/cli/approve?code=WDJB-MJHT`. Each entry through the picker refreshes this synthetic request for ten minutes. Approve and deny update only the in-memory fixture. **Expired device code** uses `BDFG-HJKL`. These fixtures cannot connect a real CLI or issue a usable production token.
- **Session received** shows a pending session and the steps still ahead. **Session without decisions** shows a ready session that produced no supported review cards. **Processing** and **Failed session** show the corresponding explanations and real next actions.
- **Ideas canvas** opens the upstream `/canvas` screen with its own local prototype data.

To reset directly, open http://localhost:54329/preview?screen=/dashboard&reset=1. The adapter rejects external redirect targets, non-loopback Host headers, unapproved browser origins, and unauthenticated fixture-table requests. The public and server keys are local placeholders.

This does not create, read or modify `.env` files. Stop both servers with Ctrl+C. To choose other ports, run `DESIGN_APP_PORT=3110 DESIGN_PREVIEW_PORT=54339 pnpm dev:design`.

Validate the adapter’s column projection, joins, compare-and-set updates, route boundaries, and synthetic product flows with `node --test scripts/design-preview.test.mjs`.

Interaction sounds are disabled across all preview and application screens. Buttons, menus and status changes use visual feedback; reduced motion remains supported. Evidence labels explain whether each quote matched its recorded session text.

## Temporary sharing

With the existing ngrok command installed and configured, stop `pnpm dev:design`, then run `pnpm share:design`. This starts an ngrok tunnel and the same synthetic preview; it prints a full-preview entry URL and a dashboard entry URL. It performs no source synchronization, commit, push or deployment. Keep the computer awake and the command running. Ctrl+C closes both the tunnel and preview. Ngrok may show a first-visit notice; choose **Visit Site** to continue.

Share the printed **full preview** URL, which gives a visitor the synthetic sample account and opens the homepage. The Design preview menu then switches to every screen through the same public origin. Normal sign-in and sign-up forms are visual previews, so use that menu to return to the sample workspace. Demo edits are in memory and shared by visitors; Reset sample workspace resets them for everyone.

The sharing command passes its exact HTTPS origin through process configuration. Development-only rewrites carry sample-account entry, browser data and realtime through that origin; server data reads remain on loopback. The sample cookie uses the same explicit name in browser and server clients. Only share mode makes this synthetic cookie browser-readable. Server-only fixture-key access is refused through the forwarded public host. Normal development retains the loopback-only preview; production has no sharing rewrites or demo navigator. No real environment files or extra packages are required.
