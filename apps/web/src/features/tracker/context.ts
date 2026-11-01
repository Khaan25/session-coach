import "server-only";

// The project context at the top of /tracker, from the build guide sent to Kasam on 31 Oct 2026. Edit here when the
// plan changes; tasks live in the tracker_tasks table. Server-only: team-only text must not land in a public chunk.
export const PROJECT_CONTEXT = `
**Session Coach** turns a Claude Code session into 3–5 decision cards the developer explains back on day 1, 3 and 7; a model grades each answer 0, 1 or 2. Live at [coach.ziaa.me](https://coach.ziaa.me). 8x Playmakers trial: feedback call **Mon 2 Nov**, demo and submit **Fri 6 Nov**, V2 (teams) right after.

**Team:** Zia (lead, reviews every PR, web app, upload API, grading, email) and Kasam (CLI, parser, extraction).

## End to end

\`\`\`
laptop                                server (Vercel + Supabase)                learner
Claude Code session ends
└─ SessionEnd hook (exits in ~50 ms)
   └─ detached worker: read, redact, gzip
      └─ POST /api/sessions ───────► token → sessions(pending) + signed URL
      └─ PUT gzip straight to Supabase Storage
      └─ POST /api/sessions/:id/process ► 202
                                        └─ after(): processSession(id)   [Kasam]
                                           processing → parse → extract → verify
                                           → decision_cards → ready | failed ─Realtime─► dashboard
                                                                              review: explain back
                                        grade 0/1/2 ◄──────────────────────── answer   [Zia]
\`\`\`

**The seam:** Zia's routes check the token, create the \`sessions\` row as \`pending\`, hand out the signed upload URL, and call \`processSession(sessionId)\` inside \`after()\`. Everything after that call is Kasam's. Neither edits the other's files.

## How we stop the model making things up

1. Every claim needs a word-for-word quote from the cited event.
2. Quotes are checked in code, not by the model; cards without a grounded quote are dropped.
3. \`stated\` only when someone wrote the reason; a guess is \`inferred\`.
4. \`files\` only lists paths from write or edit events.
5. Strict JSON, zod, one retry, then \`failed\`.

## How we work

- One small PR per task, under ~400 changed lines. Branches \`zia/<topic>\` and \`kasam/<topic>\`.
- \`pnpm format:check && pnpm typecheck && pnpm lint && pnpm test\` green; tests use fake fixtures, never real logs or keys.
- Commits like \`feat(pipeline): …\`, lowercase, no co-author lines.
- Stuck for 30 minutes? Message with what you tried. Schema and \`packages/shared\` change only after asking.
- Read first: \`AGENTS.md\`, \`docs/ARCHITECTURE.md\`, \`docs/DECISIONS.md\`.
`.trim();
