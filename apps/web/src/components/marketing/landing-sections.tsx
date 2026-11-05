import {
  CardsIcon,
  ChatTextIcon,
  ShieldCheckIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { FeatureCard } from "@/components/marketing/feature-card";
import { QuoteCheck } from "@/components/marketing/quote-check";
import { RedactionDemo } from "@/components/marketing/redaction-demo";
import { ReviewSchedule } from "@/components/marketing/review-schedule";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The landing's sections under the hero. Copy must match the code and docs/CODEBASE.md; anything they don't say is
// a TODO(zia). No scroll reveals (the design system bans them): each
// section has one demo that loops in place (the schedule, the quote check, the secret filter).

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="type-label text-text-3">{eyebrow}</p>
      <h2
        id={id}
        className="font-display text-4xl leading-tight text-balance text-text-1 sm:text-5xl"
      >
        {title}
      </h2>
    </div>
  );
}

const loop = [
  {
    step: "1",
    icon: TerminalWindowIcon,
    title: "You send a session",
    body: "The session-coach CLI sends your session's log, by hand with push or through an opt-in hook that runs when a session starts. Secrets are removed on your laptop before anything leaves it.",
  },
  {
    step: "2",
    icon: CardsIcon,
    title: "Up to 5 decision cards",
    body: "Each card names a decision your agent made, why it made it, the quotes from the session that show it, and one question for you.",
  },
  {
    step: "3",
    icon: ClockCountdownIcon,
    title: "Explain it back on day 1, 4 and 11",
    body: "You answer in your own words and get a score of 0, 1 or 2. A 2 moves the card to the next gap; less moves it one step down (never below day 1) and it comes back tomorrow. Passing the last review masters it.",
  },
  {
    step: "4",
    icon: ShieldCheckIcon,
    title: "Own it, and defend it any time",
    body: "Passing the last review masters a card, and a mastered card counts as owned: your dashboard shows how much of each project you own. To test yourself harder, defend any card you've explained: 3 minutes to answer, then one follow-up question in 2.",
  },
] as const;

export function LoopSection() {
  return (
    <section
      aria-labelledby="loop-title"
      className="mx-auto flex w-full max-w-(--container) flex-col gap-10 px-(--gutter-sm) py-20 sm:px-(--gutter) sm:py-30"
    >
      <SectionHeading
        id="loop-title"
        eyebrow="How it works"
        title="From one session to decisions you own."
      />
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loop.map(({ step, icon, title, body }) => (
          <li key={step} className="flex">
            <FeatureCard
              size="lg"
              icon={icon}
              title={
                <span>
                  <span className="sr-only">Step {step}: </span>
                  {title}
                </span>
              }
            >
              <p className="type-body text-text-2">{body}</p>
            </FeatureCard>
          </li>
        ))}
      </ol>
      <ReviewSchedule />
    </section>
  );
}

const cardFacts = [
  {
    icon: ChatTextIcon,
    title: "Stated or inferred",
    body: "A stated card quotes the reason your agent gave. An inferred card is the model's guess at a reason the agent never wrote down, and it says so.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Every quote is checked",
    body: "Plain code checks that each quote is really in the session. A card with a quote that doesn't match is flagged; a card with no matching quote is hidden from you.",
  },
] as const;

export function CardSection() {
  return (
    <section aria-labelledby="card-title" className="well">
      <div className="mx-auto flex w-full max-w-(--container) flex-col gap-10 px-(--gutter-sm) py-20 sm:px-(--gutter) sm:py-30">
        <SectionHeading
          id="card-title"
          eyebrow="What a card holds"
          title="Built from what the session shows."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            {cardFacts.map(({ icon, title, body }) => (
              <FeatureCard key={title} icon={icon} title={title}>
                <p className="type-body text-text-2">{body}</p>
              </FeatureCard>
            ))}
          </div>
          <div className="lg:col-span-2">
            <QuoteCheck />
          </div>
        </div>
      </div>
    </section>
  );
}

const trust = [
  {
    icon: MapPinIcon,
    title: "Where it lives",
    body: "Your sessions, cards and answers are stored in Supabase, in the ap-south-1 region.",
  },
] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-title"
      className="mx-auto flex w-full max-w-(--container) flex-col gap-10 px-(--gutter-sm) py-20 sm:px-(--gutter) sm:py-30"
    >
      <SectionHeading id="trust-title" eyebrow="Your code" title="What happens to your sessions." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RedactionDemo />
        </div>
        {/* Not a FeatureCard: the body sits in the header as a description, a denser card. */}
        {trust.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="self-start">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-3">
                  <Icon weight="duotone" className="size-5" aria-hidden />
                  {title}
                </span>
              </CardTitle>
              <CardDescription>{body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="type-body text-text-2">
        Read the{" "}
        <Link href="/privacy" className="text-text-1 underline underline-offset-4">
          privacy policy
        </Link>{" "}
        for who processes your data and how to delete it.
      </p>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section aria-labelledby="closing-title" className="rule-top">
      <div className="mx-auto flex w-full max-w-(--container) flex-col items-center gap-8 px-(--gutter-sm) py-20 text-center sm:px-(--gutter) sm:py-30">
        <h2
          id="closing-title"
          className="max-w-3xl font-display text-4xl leading-tight text-balance text-text-1 sm:text-6xl"
        >
          Your next session is the first decision you own.
        </h2>
        <Link href="/how-it-works" className={buttonVariants({ size: "lg" })}>
          See how it works
        </Link>
        {/* TODO(zia): point at /setup once Phase 3 lands, and add the price or trial note. */}
      </div>
    </section>
  );
}
