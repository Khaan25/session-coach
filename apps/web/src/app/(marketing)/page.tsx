import { Cards } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";
import { HandUnderline } from "@/components/marketing/hand-underline";
import { Button } from "@/components/ui/button";

// The hero follows docs/design/landing-hero.md: headline with one hand-drawn underline, subhead, CTA with a note,
// the product object, then the trust strip. Load order: nav 0ms, headline 100ms, underline 600ms, subhead 300ms,
// CTA 500ms, card 700ms, all on ease-out-quint; reduced motion drops every entrance.
const enter = "animate-in fade-in fill-mode-both ease-out-quint motion-reduce:animate-none";

export default function Home() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* The lower layer: a grey field ruled like an index card, which the card stack overlaps. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-80 well sm:h-96">
        <svg className="size-full text-line-row">
          <defs>
            <pattern id="ruled-lines" width="8" height="28" patternUnits="userSpaceOnUse">
              <line x1="0" y1="27.5" x2="8" y2="27.5" stroke="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ruled-lines)" />
        </svg>
      </div>

      <div className="mx-auto flex w-full max-w-(--container) flex-col items-center px-(--gutter-sm) pt-20 pb-20 text-center sm:px-(--gutter) sm:pt-30 sm:pb-30">
        <h1
          className={`${enter} max-w-4xl font-display text-5xl leading-none tracking-tight text-balance text-text-1 delay-100 duration-700 slide-in-from-bottom-6 sm:text-7xl lg:text-8xl`}
        >
          <span className="relative inline-block italic">
            Explain
            <HandUnderline className="absolute inset-x-0 top-full -mt-1 h-3 w-full text-accent-line sm:h-4" />
          </span>{" "}
          the code your agent wrote.
        </h1>

        <p
          className={`${enter} mt-8 max-w-lg type-body-lg text-pretty text-text-2 delay-300 duration-700 slide-in-from-bottom-4 sm:mt-10`}
        >
          Explain back the decisions your coding agent made. Each session becomes 3 to 5 decision
          cards, due again on day 1, 3 and 7.
        </p>

        <div
          className={`${enter} mt-8 flex flex-col items-center gap-3 delay-500 duration-700 slide-in-from-bottom-4`}
        >
          <Button size="lg" nativeButton={false} render={<Link href="/how-it-works" />}>
            <Cards weight="duotone" data-icon="inline-start" aria-hidden />
            See how it works
          </Button>
          {/* TODO(zia): the reassurance note (price, trial, setup time) once those are decided. */}
          <p className="type-body-sm text-text-2">Built for Claude Code sessions.</p>
        </div>

        <div
          className={`${enter} mt-16 w-full delay-700 duration-1000 slide-in-from-bottom-10 sm:mt-20`}
        >
          <DecisionCardPreview />
        </div>

        {/* TODO(zia): the trusted-by strip goes here once there are real teams or learners to name. */}
      </div>
    </section>
  );
}
