# Components

How app components (everything outside `apps/web/src/components/ui/`) are put together, and why. The `ui/` primitives follow shadcn and Base UI; they get their own pass later.

## The ladder

Use the lowest rung that works. Climb only when a second real caller needs the next one: with one caller, a more flexible API is a guess.

1. **Plain props** for data: `session`, `cardCount`, `now`.
2. **`children`** for the content of a frame. A component that fixes the frame (card, panel, page section) takes its body as `children`.
3. **Named slot props** (`title`, `description`, `action`) as `ReactNode`, for the other regions of that frame. Never `renderTitle()` callbacks.
4. **Compound parts** (`AuthCard`, `AuthStatus`, `AuthSwitch`) when callers arrange the pieces themselves. Plain exported functions; add context only when the parts must read the same state.
5. **Render prop** only when the caller renders with values the wrapper owns (generated ids, state) _and_ the wrapper also owns markup. If it would only call `children(data)`, write a hook instead.

## Rules

- **No boolean that picks a layout.** Two looks are two named components, or a `variant` in the primitive's `cva`. A boolean is for a real on/off state (`disabled`, `pending`). Delete props no caller passes.
- **Shared state lives in a provider that owns the implementation.** Components read it with `use(Ctx)` and never learn about Supabase or Realtime. Render `<Ctx value={…}>`, not `<Ctx.Provider>`. Never `cloneElement` to inject props.
- **Shared logic is a hook named for its job** (`useLiveSessions`). Not a lifecycle wrapper, not a hook around one `useState`.
- **Swap the rendered element with Base UI's `render`**: `render={<Link href="/settings" />}`. No `as` prop, no wrapping a primitive in `<a>`. React 19 passes `ref` as a prop, so no `forwardRef`.
- **Domain rules live in `lib/`, with a test**: what a session is called (`lib/sessions/name.ts`), a learner's initials (`lib/auth/initials.ts`), the redirect allow-list (`lib/auth/safe-next.ts`). Components import them, so the sidebar, the header and a toast can't disagree.
- **Server first.** A component is a Server Component unless it needs state, effects or browser APIs. Data reads happen in the server parent inside `<Suspense>`; the client child gets plain props.
- **"No visual change" needs proof:** a before/after pixel diff of every affected route.

## Sources (checked 2026-10-30)

- react.dev, [Passing JSX as children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children) and [Reusing logic with custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React 19 release notes](https://react.dev/blog/2024/12/05/react-19): `ref` as a prop, `use(Context)`, `<Context value>`
- Base UI, [Composition handbook](https://base-ui.com/react/handbook/composition): the `render` prop
- Kent C. Dodds, [Inversion of control](https://kentcdodds.com/blog/inversion-of-control)
- patterns.dev, [Compound](https://www.patterns.dev/react/compound-pattern/) and [Render props](https://www.patterns.dev/react/render-props-pattern/)
