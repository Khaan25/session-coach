import { CardsIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { BentoSection } from "@/components/marketing/bento-section";
import { HandUnderline } from "@/components/marketing/hand-underline";
import { HeroVideo } from "@/components/marketing/hero-video";
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
// the product object, then the trust strip. The product object is the hero film in a panel card. Headline, subhead and
// CTA are there on first paint (no entrance, and no LCP delay); the underline draws in at 600ms and the film's card
// enters at 700ms, on ease-out-quint. Reduced motion drops every entrance and keeps the film on its poster.
// Structured data for search results: what the product is, that it's free during the trial, and who makes it.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Session Coach",
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Session Coach tracks the decisions your Claude Code agent makes, project by project. Explain each one in your own words after 1 day, then 3, then 7 until you own it, and defend it whenever you like.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const LESS_THAN = /</g;

const enter = "animate-in fade-in fill-mode-both ease-out-quint motion-reduce:animate-none";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static data built above, so there's nothing user-supplied to escape; < is escaped anyway.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(LESS_THAN, "\\u003c") }}
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
              Own
              <HandUnderline className="absolute inset-x-0 top-full -mt-1 h-3 w-full text-accent-line sm:h-4" />
            </span>{" "}
            the code your agent writes.
          </h1>

          <p className="mt-8 max-w-lg type-body-lg text-pretty text-text-2 sm:mt-10">
            Each Claude Code session becomes up to 5 decision cards, filed by project. Explain each
            decision in your own words until it&rsquo;s yours, and defend it against a follow-up
            whenever you like.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                <CardsIcon weight="duotone" data-icon="inline-start" aria-hidden />
                Get started
              </Link>
              <Link
                href="/how-it-works"
                className={buttonVariants({ size: "lg", variant: "secondary" })}
              >
                See how it works
              </Link>
            </div>
            <p className="type-body-sm text-text-2">
              Free during the trial. Built for Claude Code sessions.
            </p>
          </div>

          <div
            className={`${enter} mt-16 w-full delay-700 duration-1000 slide-in-from-bottom-10 sm:mt-20`}
          >
            <HeroVideo />
          </div>

          {/* TODO(zia): the trusted-by strip goes here once there are real teams or learners to name. */}
        </div>
      </section>
      <BentoSection />
      <LoopSection />
      <CardSection />
      <TrustSection />
      <ClosingSection />
      <FooterScene />
    </>
  );
}
