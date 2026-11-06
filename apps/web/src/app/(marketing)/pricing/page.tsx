import { TerminalWindowIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPage } from "@/components/marketing/marketing-page-header";
import { buttonVariants } from "@/components/ui/button";

// No billing code here: the plan says free during the trial, one plan. Every claim must match the code
// and docs/CODEBASE.md.

export const metadata: Metadata = {
  title: "Pricing | Session Coach",
  description: "Session Coach is free during the trial. One plan with everything in it.",
};

// The three things people ask before they sign up, answered in a list under the price.
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
    a: "Up to 5 decision cards per session, reviews on day 1, 4 and 11, and progress by project.",
  },
] as const;

export default function Page() {
  return (
    <MarketingPage title="Free" lead="One plan with everything in it, during the trial.">
      {/* The CLI has shipped, so the plan's call to action is setup. */}
      <div>
        <Link href="/setup" className={buttonVariants({ size: "lg" })}>
          <TerminalWindowIcon weight="duotone" data-icon="inline-start" aria-hidden />
          Set it up
        </Link>
      </div>
      <dl className="flex flex-col divide-y divide-line-row">
        {questions.map(({ q, a }) => (
          <div key={q} className="flex flex-col gap-1 py-4">
            <dt className="type-label text-text-1">{q}</dt>
            <dd className="type-body text-text-2">{a}</dd>
          </div>
        ))}
      </dl>
    </MarketingPage>
  );
}
