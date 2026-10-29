import {
  CardsIcon,
  ChatTextIcon,
  ClockCountdownIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The landing's sections under the hero. Copy comes only from docs/plans/pages-and-dashboard.md and
// docs/ARCHITECTURE.md; anything they don't say is a TODO(zia). No scroll reveals (Quartz bans them).

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
    title: "Your session ends",
    body: "A hook in Claude Code sends the session's log when it ends. Secrets are removed on your laptop before anything leaves it.",
  },
  {
    step: "2",
    icon: CardsIcon,
    title: "3 to 5 decision cards",
    body: "Each card names a decision your agent made, why it made it, the quotes from the session that show it, and one question for you.",
  },
  {
    step: "3",
    icon: ClockCountdownIcon,
    title: "Explain it back on day 1, 3 and 7",
    body: "You answer in your own words and get a score of 0, 1 or 2. A 2 moves the card to the next gap; less starts it again at day 1. Passing day 7 masters it.",
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
        title="One session in, three reviews out."
      />
      <ol className="grid gap-4 md:grid-cols-3">
        {loop.map(({ step, icon: Icon, title, body }) => (
          <li key={step} className="flex">
            <Card size="lg" className="w-full">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-3">
                    <Icon weight="duotone" className="size-6" aria-hidden />
                    <span>
                      <span className="sr-only">Step {step}: </span>
                      {title}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="type-body text-text-2">{body}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
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
        <div className="grid gap-4 md:grid-cols-2">
          {cardFacts.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-3">
                    <Icon weight="duotone" className="size-5" aria-hidden />
                    {title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="type-body text-text-2">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const trust = [
  {
    icon: LockKeyIcon,
    title: "Secrets removed twice",
    body: "On your laptop before the log is sent, and again on the server before it is stored.",
  },
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
      <div className="grid gap-4 md:grid-cols-2">
        {trust.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
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
          Your next session is your first set of cards.
        </h2>
        <Link href="/how-it-works" className={buttonVariants({ size: "lg" })}>
          See how it works
        </Link>
        {/* TODO(zia): point at /setup once Phase 3 lands, and add the price or trial note. */}
      </div>
    </section>
  );
}
