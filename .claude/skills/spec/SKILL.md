---
name: spec
description: Research a change against this codebase, then write requirements plus a phased plan in docs/plans/ before any code. Use for "plan this", "what do we need for X", "audit this and tell me what we need", or before any feature that spans more than one file.
argument-hint: "[the feature or change to plan]"
---

# Spec

No code in this skill. The output is one file: `docs/plans/<topic>.md`.

1. **Read first.** AGENTS.md, docs/ARCHITECTURE.md, docs/DECISIONS.md, the shared schemas in `packages/shared`, the migration, and every file the change would touch. Note what already exists so the plan reuses it.
2. **Ask only what blocks the plan.** Product choices the code can't answer (copy, which data a screen shows, who can see it). One question per message, with a recommendation.
3. **Write the requirements.** Who it's for, what they can do, and what "done" means as checks someone can run (a URL that loads, a row that appears, a test that passes).
4. **Write the plan in phases.** Each phase lands as one PR that works on its own. Per phase: files to add or change, data it reads/writes, analytics events, tests, and the risk. Mark anything that changes a shared contract.
5. **List open questions and decisions** at the end; decisions also go into docs/DECISIONS.md once agreed.
