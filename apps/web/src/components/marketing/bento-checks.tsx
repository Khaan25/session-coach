"use client";

import {
  CardsIcon,
  EyeSlashIcon,
  FlagIcon,
  LockKeyIcon,
  QuotesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { useLoopStep } from "@/hooks/use-loop-step";
import type { Kind } from "@/lib/ui/kind";

// The bento's checks: the steps a session passes before a learner sees a card, one in focus at a time. Every
// 2600ms the list moves up one row in 300ms; the row in focus is sharp on paper, its neighbours blurred and faded,
// and its tick lands 300ms after it arrives (.reanimate/bento/spec.md rows 7-8). Rows two or more away are
// invisible, so the one that wraps from top to bottom travels unseen. Reduced motion stays on the first row.
const checks: { kind: Kind; icon: typeof LockKeyIcon; label: string }[] = [
  { kind: "key", icon: LockKeyIcon, label: "Secrets removed on your laptop" },
  { kind: "key", icon: ShieldCheckIcon, label: "Removed again on the server" },
  { kind: "agent", icon: QuotesIcon, label: "Every quote found in the session" },
  { kind: "run", icon: FlagIcon, label: "A quote that doesn't match is flagged" },
  { kind: "model", icon: EyeSlashIcon, label: "No matching quote, card hidden" },
  { kind: "deploy", icon: CardsIcon, label: "Up to 5 cards ready for you" },
];

const STEP_MS = 2600;

// Row offset from the focus, as a class: 56px a row (a 48px row and an 8px gap).
const offsetClass: Record<number, string> = {
  [-2]: "-translate-y-28 opacity-0",
  [-1]: "-translate-y-14 opacity-50 blur-row",
  0: "translate-y-0 opacity-100",
  1: "translate-y-14 opacity-50 blur-row",
  2: "translate-y-28 opacity-0",
};

export function BentoChecks() {
  const active = useLoopStep(checks.length, STEP_MS);

  return (
    <ul aria-label="Checks on every session" className="relative h-40 w-full overflow-hidden">
      {checks.map(({ kind, icon: Icon, label }, i) => {
        // Distance from the focus, wrapped into -2..3 so the list loops.
        const d = ((i - active + checks.length + 2) % checks.length) - 2;
        const focused = d === 0;
        return (
          <li
            key={label}
            aria-current={focused || undefined}
            className={cn(
              "absolute inset-x-0 top-14 flex h-12 items-center gap-3 rounded-soft px-3 transition-all duration-300 ease-out motion-reduce:transition-none",
              offsetClass[d] ?? "translate-y-28 opacity-0",
              focused ? "frame bg-page" : "bg-transparent",
            )}
          >
            <span
              data-kind={kind}
              className="grid size-7 place-content-center rounded-inner bg-accent-field text-on-accent-field"
            >
              <Icon weight="bold" className="size-4" aria-hidden />
            </span>
            <span className={cn("min-w-0 flex-1 truncate type-label", !focused && "text-text-2")}>
              {label}
            </span>
            <CheckCircleIcon
              weight="fill"
              aria-hidden
              className={cn(
                "size-5 text-success transition-all duration-200 ease-out motion-reduce:transition-none",
                focused ? "scale-100 opacity-100 delay-300" : "scale-40 opacity-0",
              )}
            />
          </li>
        );
      })}
    </ul>
  );
}
