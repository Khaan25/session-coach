import Image from "next/image";
import Link from "next/link";

import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";
import { HandUnderline } from "@/components/marketing/hand-underline";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";

// The landing page: a centred hero, then a bento grid, the trust band and the
// install command, each blurring in on scroll. Copy must match the code and docs/CODEBASE.md; anything they don't say is a TODO(zia).

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
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip">
      {/* A soft watercolour wash: three blurred kind fields behind the copy and the scene, never behind body text alone. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          data-kind="agent"
          className="absolute top-24 -left-24 size-96 rounded-full bg-accent-field opacity-40 blur-3xl"
        />
        <div
          data-kind="key"
          className="absolute top-8 -right-16 size-96 rounded-full bg-accent-field opacity-40 blur-3xl"
        />
        <div
          data-kind="model"
          className="absolute bottom-0 left-1/3 size-96 rounded-full bg-accent-field opacity-30 blur-3xl"
        />
      </div>
      <div className={`${section} items-center gap-8 pt-16 text-center sm:pt-24`}>
        <p className="type-label text-text-3">
          For Claude Code sessions ·{" "}
          <span className="font-accent type-body-lg text-brand italic">understood by you</span>
        </p>
        <h1 id="hero-title" className="type-display text-balance text-text-1 sm:type-display-xl">
          <span className="relative inline-block font-accent font-normal italic">
            Own
            <HandUnderline className="absolute inset-x-0 -bottom-2 h-3 w-full text-brand" />
          </span>{" "}
          the code
          <br />
          your agent writes.
        </h1>
        <p className="max-w-120 type-body-lg text-pretty text-text-2">
          Keep the thinking behind every choice. Each session becomes up to 5 decision cards you
          explain in your own words until they&rsquo;re yours.
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
            <Link
              href="/how-it-works"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              See how it works
            </Link>
          </div>
          <p className="type-body-sm text-text-3">Free during the trial.</p>
        </div>
      </div>
      {/* The team's own watercolour scene: the learner at work, and the agent beside them holding a card. */}
      <div className="relative mx-auto mt-8 w-full max-w-(--container) px-(--gutter-sm) sm:px-(--gutter)">
        <Image
          src="/art/companion/engineer-meadow.webp"
          alt="A developer sitting cross-legged in a meadow, working on a laptop."
          width={2172}
          height={724}
          sizes="(min-width: 1120px) 1072px, 100vw"
          preload
          className="h-auto w-full"
        />
        <Image
          src="/art/companion/agent.webp"
          alt="A small friendly robot holding a decision card."
          width={1312}
          height={1199}
          sizes="(min-width: 640px) 160px, 96px"
          className="absolute right-1/5 bottom-4 h-auto w-24 sm:w-40"
        />
      </div>
    </section>
  );
}

/** One bento tile: a static picture of the product on top, then its heading and one line. */
function BentoTile({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`frame flex min-h-64 flex-col bg-page ${className ?? ""}`}>
      <div aria-hidden className="flex flex-1 items-center justify-center overflow-clip p-6">
        {children}
      </div>
      <div className="flex flex-col gap-1 px-6 pb-6">
        <h3 className="type-heading-sm text-text-1">{title}</h3>
        <p className="type-body text-pretty text-text-2">{body}</p>
      </div>
    </li>
  );
}

const reviewDays = ["Day 1", "Day 4", "Day 11"] as const;

/**
 * What Session Coach does, as a bento grid after Clerk's landing (2026-11-06): one tall tile with a real decision card,
 * four tiles around it, each a picture over one claim. Three columns from lg, two from sm, one on phones.
 */
export function BentoSection() {
  return (
    <section aria-labelledby="bento-title" className="overflow-x-clip py-16 sm:py-24">
      <Reveal className={section}>
        <SectionHeading
          id="bento-title"
          title="From one session to decisions you own."
          lead="Send a session, get up to 5 decision cards, explain each one back until it's yours."
        />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-flow-col lg:grid-cols-3 lg:grid-rows-2">
          <BentoTile
            className="sm:col-span-2 lg:col-span-1 lg:row-span-2"
            title="Cards built from your session"
            body="Each names a decision, why your agent made it, and the quote from the log that shows it."
          >
            <div className="w-full scale-90">
              <DecisionCardPreview />
            </div>
          </BentoTile>
          <BentoTile
            title="Secrets removed before upload"
            body="The CLI strips the keys and tokens it recognises, and the server redacts again. It can miss some, so check what you send."
          >
            <div className="frame flex w-full max-w-72 flex-col gap-2 bg-well p-4 type-code-sm text-text-2">
              <span>OPENAI_API_KEY=[REDACTED]</span>
              <span>Authorization: Bearer [REDACTED]</span>
              <span>~/code/app/src/upload.ts</span>
            </div>
          </BentoTile>
          <BentoTile
            title="Reviews on day 1, 4 and 11"
            body="Answer from memory, then see the why. A miss brings the card back tomorrow."
          >
            <ol className="flex flex-wrap items-center justify-center gap-2">
              {reviewDays.map((day) => (
                <li key={day}>
                  <Badge variant="outline">{day}</Badge>
                </li>
              ))}
              <li>
                <Badge variant="success">Owned</Badge>
              </li>
            </ol>
          </BentoTile>
          <BentoTile
            title="Explain it in your own words"
            body="Every answer is scored 0, 1 or 2 against the session, not a multiple-choice key."
          >
            <div className="frame flex w-full max-w-72 flex-col gap-3 bg-page p-4">
              <p className="type-body text-text-2">
                Logs are repetitive text, so gzip shrinks them several times over…
              </p>
              <span className="flex items-center justify-between type-label-sm text-text-3">
                Score
                <Badge variant="success">2 · Explained</Badge>
              </span>
            </div>
          </BentoTile>
          <BentoTile
            title="Defend it under time"
            body="Pick a card you own and answer a follow-up against the clock, with paste turned off."
          >
            <div className="flex flex-col items-center gap-1">
              <span className="type-stat-lg text-text-1 tabular-nums">4:32</span>
              <span className="type-label-sm text-text-3">1 of 2 · your answer</span>
            </div>
          </BentoTile>
        </ul>
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
    <section
      aria-labelledby="trust-title"
      data-surface="inverse"
      className="bg-page py-16 sm:py-24"
    >
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
