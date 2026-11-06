import Image from "next/image";
import Link from "next/link";

import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";
import { Reveal } from "@/components/marketing/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

// The landing page (docs/design/serveros-redesign.md): a centred hero, then four short sections that blur in on
// scroll. Copy must match the code and docs/CODEBASE.md; anything they don't say is a TODO(zia).

const section =
  "mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) sm:px-(--gutter)";

function SectionHeading({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="flex max-w-160 flex-col gap-4">
      <h2 id={id} className="type-display text-balance text-text-1 sm:type-display-lg">
        {title}
      </h2>
      <p className="type-body-lg text-pretty text-text-2">{lead}</p>
    </div>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className={`${section} items-center pt-16 pb-16 text-center sm:pt-24 sm:pb-24`}
    >
      <div className="flex max-w-4xl flex-col items-center gap-6">
        <h1 id="hero-title" className="type-display text-balance text-text-1 sm:type-display-xl">
          Own the code your agent writes.{" "}
          <span className="block text-text-2">Explain each decision until it&rsquo;s yours.</span>
        </h1>
        <p className="max-w-160 type-body-lg text-pretty text-text-2">
          Each Claude Code session becomes up to 5 decision cards, filed by project. Answer each in
          your own words on day 1, 4 and 11, and defend it against a follow-up whenever you like.
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
            <Link
              href="/how-it-works"
              className="type-label text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
            >
              See how it works
            </Link>
          </div>
          <p className="type-body-sm text-text-3">
            Free during the trial. Built for Claude Code sessions.
          </p>
        </div>
      </div>
      <Reveal className="w-full">
        {/* The real dashboard, shot by e2e/screens.spec.ts at 1440x900, in a plain browser frame. */}
        <figure className="frame bg-page">
          <div aria-hidden className="flex gap-1.5 px-4 py-3 rule-row-frame">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-2.5 rounded-full bg-line-row" />
            ))}
          </div>
          <Image
            src="/art/dashboard.webp"
            alt="The Session Coach dashboard: two cards due today, ownership by project and the sessions list."
            width={1440}
            height={900}
            sizes="(min-width: 1120px) 1072px, 100vw"
            className="h-auto w-full dark:hidden"
          />
          <Image
            src="/art/dashboard-night.webp"
            alt="The Session Coach dashboard: two cards due today, ownership by project and the sessions list."
            width={1440}
            height={900}
            sizes="(min-width: 1120px) 1072px, 100vw"
            className="hidden h-auto w-full dark:block"
          />
        </figure>
      </Reveal>
    </section>
  );
}

const loop = [
  {
    title: "You send a session",
    body: "The CLI uploads its log. Secrets are removed on your laptop first.",
  },
  {
    title: "Up to 5 decision cards",
    body: "Each names a decision, why your agent made it and the quotes that show it.",
  },
  {
    title: "Explain it back",
    body: "Answer in your own words on day 1, 4 and 11, scored 0, 1 or 2.",
  },
  {
    title: "Own it",
    body: "Pass the last review and the card is yours. Defend it any time.",
  },
] as const;

export function LoopSection() {
  return (
    <section aria-labelledby="loop-title" className="py-16 sm:py-24">
      <Reveal className={section}>
        <SectionHeading
          id="loop-title"
          title="From one session to decisions you own."
          lead="Four steps, and the last one is yours to keep."
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loop.map(({ title, body }, index) => (
            <li key={title} className="flex">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>
                    <span className="sr-only">Step {index + 1}: </span>
                    {title}
                  </CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

export function CardSection() {
  return (
    <section aria-labelledby="card-title" className="overflow-x-clip py-16 sm:py-24">
      <Reveal className={`${section} items-center gap-16 lg:flex-row lg:justify-between`}>
        <SectionHeading
          id="card-title"
          title="Built from what the session shows."
          lead="Plain code checks every quote against the session. A card with a quote it can't verify is flagged; a card with none is hidden."
        />
        <DecisionCardPreview />
      </Reveal>
    </section>
  );
}

const trust = [
  "Only the session logs you send leave your laptop.",
  "Secrets are removed on your laptop, and again on the server.",
  "Sessions, cards and answers are stored in Supabase, in the ap-south-1 region.",
  "Deleting your account removes all of it for good.",
] as const;

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" data-surface="ink" className="bg-page py-16 sm:py-24">
      <Reveal className={section}>
        <SectionHeading
          id="trust-title"
          title="What happens to your sessions."
          lead="Secret removal can miss some, so check what your sessions contain."
        />
        <ul className="flex max-w-160 flex-col divide-y divide-line-row">
          {trust.map((line) => (
            <li key={line} className="py-4 type-body text-text-1">
              {line}
            </li>
          ))}
        </ul>
        <p className="type-body text-text-2">
          Read the{" "}
          <Link href="/privacy" className="text-text-1 underline underline-offset-4">
            privacy policy
          </Link>{" "}
          for who processes your data and how to delete it.
        </p>
      </Reveal>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section aria-labelledby="closing-title" className="py-16 sm:py-24">
      <Reveal className={`${section} items-center text-center`}>
        <h2
          id="closing-title"
          className="max-w-160 type-display text-balance text-text-1 sm:type-display-lg"
        >
          Your next session is the first decision you own.
        </h2>
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <CodeBlock
            variant="command"
            command="npx session-coach@latest login"
            copyLabel="Copy the login command"
            className="w-full text-start"
          />
          <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
            Get started
          </Link>
          <p className="type-body-sm text-text-3">Free during the trial.</p>
        </div>
      </Reveal>
    </section>
  );
}
