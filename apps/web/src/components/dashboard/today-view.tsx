import Link from "next/link";

import { Sprite, type SpriteName } from "@/components/art/sprite";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import type { QueueCard } from "@/lib/review/queries";
import { DAILY_CAP } from "@/lib/review/today";

// Today, the learner's home (/dashboard). One calm column with exactly one thing to do: a small greeting, the hero (the
// next card, the done state or the first setup step), one quiet habit line, then two text links. Everything else the
// old dashboard showed lives on /progress and /review (DECISIONS, 2026-11-06 "Today replaces the dashboard").
// Takes everything as props: the page reads the learner's rows, the loading skeleton passes sample ones.

export function TodayView({
  greeting,
  lede,
  before,
  hero,
  habit,
}: {
  /** "Evening, Sam": the page's h1, kept small; the hero carries the weight. */
  greeting: string;
  /** One muted sentence under the greeting. */
  lede: string;
  /** Above the hero: a new project's question-level step. */
  before?: React.ReactNode;
  hero: React.ReactNode;
  /** One muted line under the hero, such as "You own 4 of 12 decisions"; null leaves it out. */
  habit: string | null;
}) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-sm text-text-1">{greeting}</h1>
        <p className="type-body text-text-2">{lede}</p>
      </header>
      {before}
      {/* One gentle entrance for the one thing to do. */}
      <div className="motion-safe:animate-enter">{hero}</div>
      {habit && <p className="type-body-sm text-text-3">{habit}</p>}
      <nav aria-label="More" className="flex gap-6">
        <Link href="/progress" className={buttonVariants({ variant: "link" })}>
          Progress
        </Link>
        <Link href="/progress#by-session" className={buttonVariants({ variant: "link" })}>
          Sessions
        </Link>
      </nav>
    </>
  );
}

/**
 * The hero while cards are due: the next card itself, framed like the cards in /review, its question large and the one
 * button that starts it. Never its why. (The unframed variant read as more page text under the greeting.)
 */
export function NextCard({ card, left }: { card: QueueCard; left: number }) {
  return (
    <Card size="lg">
      <CardHeader>
        <CardDescription>
          {card.decision} · {card.sessionName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h2 className="type-heading-lg text-balance text-text-1">{card.question}</h2>
      </CardContent>
      <CardFooter>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/review/${card.id}`}
            transitionTypes={["forward"]}
            className={buttonVariants({ size: "lg" })}
          >
            Explain it
          </Link>
          <p className="type-body-sm text-text-3">
            {left} {left === 1 ? "card" : "cards"} left today · at most {DAILY_CAP} a day
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}

/** A hero with no card: a watercolour object, a title, one muted line and at most two actions. */
export function TodayMessage({
  title,
  description,
  action,
  sprite,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  /** The desk object that sets the moment: tea when done, a letter on a first visit. */
  sprite?: SpriteName;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-6">
      {sprite && <Sprite name={sprite} className="w-20" />}
      <div className="flex flex-col gap-3">
        <h2 className="type-heading-lg text-balance text-text-1">{title}</h2>
        <p className="type-body text-pretty text-text-2">{description}</p>
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </section>
  );
}
