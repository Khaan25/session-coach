<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design system

- Components are shadcn/ui `base-nova` on Base UI (`@base-ui/react`), not Radix. Add new ones with `pnpm dlx shadcn@4.23.0 add <name>`.
- Run `pnpm lint` after UI changes. It runs oxlint with `@shadcn/lint` as a JS plugin (`.oxlintrc.json`). Its errors say which variant, token or layout class to use instead; follow them.
- New looks for a shadcn component go in as a variant in `src/components/ui/<name>.tsx`, not as `className` overrides at the call site.
