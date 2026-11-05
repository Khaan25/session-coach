import { TerminalWindowIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// No billing code here: the plan says free during the trial, one plan. Every claim must match the code
// and docs/CODEBASE.md.

export const metadata: Metadata = {
  title: "Pricing | Session Coach",
  description: "Session Coach is free during the trial. One plan with everything in it.",
};

// The three things people ask before they sign up, answered in a row under the price.
const questions = [
  {
    q: "Do I need a card?",
    a: "No card needed, and we won't charge you without asking first.",
  },
  {
    q: "How long is it free?",
    a: "Free during the 8x Playmakers trial, 28 Oct to 6 Nov 2026.",
  },
  {
    q: "What do I get?",
    a: "The command-line tool, up to 5 decision cards per session, reviews on day 1, 4 and 11, progress by project, and a daily email when cards are due, which you can turn off.",
  },
] as const;

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-(--gutter-sm) py-16 text-center sm:px-(--gutter) sm:py-20">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-7xl leading-none text-text-1 sm:text-8xl">Free</h1>
        <p className="type-body-lg text-pretty text-text-2">
          One plan with everything in it, during the trial.
        </p>
      </div>
      {/* The CLI has shipped, so the plan's call to action is setup. */}
      <Link href="/setup" className={buttonVariants({ size: "lg" })}>
        <TerminalWindowIcon weight="duotone" data-icon="inline-start" aria-hidden />
        Set it up
      </Link>
      <dl className="grid w-full gap-6 text-start sm:grid-cols-3">
        {questions.map(({ q, a }) => (
          <div key={q} className="flex flex-col gap-2">
            <dt className="type-label text-text-1">{q}</dt>
            <dd className="type-body-sm text-text-2">{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
