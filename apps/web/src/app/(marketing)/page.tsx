import { CardsIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";
import { HandUnderline } from "@/components/marketing/hand-underline";
import {
  CardSection,
  ClosingSection,
  LoopSection,
  TrustSection,
} from "@/components/marketing/landing-sections";
import { FooterScene } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/site";

// The hero follows docs/design/landing-hero.md: headline with one hand-drawn underline, subhead, CTA with a note,
// the product object, then the trust strip. Headline, subhead and CTA are there on first paint (no entrance, and no
// LCP delay); the underline draws in at 600ms and the card enters at 700ms, on ease-out-quint. Reduced motion drops
// every entrance.
// Structured data for search results: what the product is, that it's free during the trial, and who makes it.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Session Coach",
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Each Claude Code session becomes 3 to 5 decision cards. Explain them back in your own words on day 1, 3 and 7.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const enter = "animate-in fade-in fill-mode-both ease-out-quint motion-reduce:animate-none";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static data built above, so there's nothing user-supplied to escape; < is escaped anyway.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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
          <h1 className="max-w-4xl font-display text-5xl leading-none tracking-tight text-balance text-text-1 sm:text-7xl lg:text-8xl">
            <span className="relative inline-block italic">
              Explain
              <HandUnderline className="absolute inset-x-0 top-full -mt-1 h-3 w-full text-accent-line sm:h-4" />
            </span>{" "}
            the code your agent wrote.
          </h1>

          <p className="mt-8 max-w-lg type-body-lg text-pretty text-text-2 sm:mt-10">
            Explain back the decisions your coding agent made. Each session becomes 3 to 5 decision
            cards, due again on day 1, 3 and 7.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/how-it-works" className={buttonVariants({ size: "lg" })}>
              <CardsIcon weight="duotone" data-icon="inline-start" aria-hidden />
              See how it works
            </Link>
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
      <LoopSection />
      <CardSection />
      <TrustSection />
      <ClosingSection />
      <FooterScene />
    </>
  );
}
