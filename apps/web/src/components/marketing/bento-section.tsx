import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import sample from "@session-coach/shared/fixtures/session.sample.json";
import Link from "next/link";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { BentoChecks } from "@/components/marketing/bento-checks";
import { BentoCommand } from "@/components/marketing/bento-command";
import {
  LiveDot,
  MotionProvider,
  RingingBell,
  WeekBars,
} from "@/components/marketing/bento-motion";
import { BentoSpin } from "@/components/marketing/bento-spin";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";

// The landing's bento: four cards for the product's four moments (a session ends, the CLI sends it, the checks run,
// the reviews come due). Layout and motion follow the reference in .reanimate/bento/spec.md; the look is the design
// system's (paper frames, grey wells, no shadows). Each card sets its tinted panel as a well inset 8px in the frame.
// The session is the shared sample's; the review numbers are made up for the preview.
const { session } = sample;
const cards = sample.cards.filter((visible) => !visible.hidden);
const card = cards[0];

const week = [
  { day: "M", bar: "h-6" },
  { day: "T", bar: "h-3" },
  { day: "W", bar: "h-10" },
  { day: "T", bar: "h-5" },
  { day: "F", bar: "h-12" },
  { day: "S", bar: "h-8" },
  { day: "S", bar: "h-1", today: true },
];

const reviews: { initial: string; decision: string; when: string; score: Score }[] = [
  { initial: "E", decision: "ESM imports with .js", when: "Day 4 · Today, 09:12", score: 2 },
  { initial: "S", decision: "Skip unknown line types", when: "Day 1 · Yesterday, 21:40", score: 1 },
  { initial: "N", decision: "Number after filtering", when: "Day 11 · Mon, 18:05", score: 0 },
];

function SessionCard() {
  return (
    // Hover or focus lifts the panel 56px in 300ms, out of the footer's way, to show the card's why.
    <Card className="group/session min-h-120">
      <div className="relative m-2 flex flex-1 flex-col items-center justify-center rounded-soft well pb-32">
        <Badge variant="success" className="absolute start-3 top-3">
          <LiveDot />
          Ready
        </Badge>
        <BentoSpin />
      </div>
      <div className="absolute inset-x-2 bottom-16 flex translate-y-14 flex-col gap-1 rounded-soft bg-page p-4 transition-transform duration-300 ease-out group-focus-within/session:translate-y-0 group-hover/session:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none">
        <p className="type-body-sm text-text-2">
          {session.duration_min} min session · {cards.length} cards
        </p>
        <h3 className="type-heading-sm text-text-1">{session.title}</h3>
        <p className="mt-2 line-clamp-2 type-body-sm text-text-2">{card.why}</p>
      </div>
      <div className="relative flex h-16 items-center justify-between gap-3 bg-page px-4 rule-top">
        <span className="type-code-sm text-text-2">{session.repo}</span>
        <span className="flex gap-1.5">
          <Badge variant="outline">Stated</Badge>
          <Badge variant="outline">Inferred</Badge>
        </span>
      </div>
    </Card>
  );
}

function CliCard() {
  return (
    <Card>
      <div className="m-2 rounded-soft well p-3">
        <BentoCommand />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-4">
        <h3 className="type-heading-xs text-text-1">Drops into Claude Code</h3>
        <Link href="/how-it-works" className={buttonVariants({ variant: "link" })}>
          How it works
          <ArrowUpRightIcon data-icon="inline-end" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function ChecksCard() {
  return (
    <Card className="flex-1">
      <div className="m-2 flex flex-1 items-center rounded-soft well px-4 py-2">
        <BentoChecks />
      </div>
      <div className="flex flex-col items-start gap-2 p-4">
        <h3 className="type-heading text-text-1">Checked before you see it</h3>
        <p className="type-body text-text-2">Every session passes the same checks.</p>
        <Badge variant="outline">Before every card</Badge>
      </div>
    </Card>
  );
}

function ReviewsCard() {
  return (
    <Card className="md:col-span-2 lg:col-span-1">
      <div
        data-kind="run"
        className="m-2 flex flex-col items-center gap-3 rounded-soft bg-accent-field p-4 pb-6 text-on-accent-field"
      >
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 type-label">
            <span className="grid size-6 place-content-center rounded-full bg-page type-label-sm text-text-1">
              Y
            </span>
            Your reviews
          </span>
          <RingingBell />
        </div>
        <span className="rounded-full bg-page/15 px-3 py-0.5 type-body-sm">Due today</span>
        <p className="type-stat-xl">3 cards</p>
      </div>

      <div className="mx-2 flex items-end justify-between gap-4 rounded-soft well p-4">
        <div className="flex flex-col gap-0.5">
          <p className="type-body-sm text-text-2">This week</p>
          <p className="type-stat-lg text-text-1">11</p>
          <p className="type-body-sm text-text-2">cards explained</p>
        </div>
        <WeekBars week={week} />
      </div>

      <div className="flex flex-col px-4 pt-3 pb-2">
        <p className="type-body-sm text-text-2">Latest explain-backs</p>
        <ul>
          {reviews.map(({ initial, decision, when, score }) => (
            <li key={decision} className="flex items-center gap-3 rule-row py-2.5 last:shadow-none">
              <span className="grid size-8 shrink-0 place-content-center rounded-full well type-label text-text-2">
                {initial}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate type-label text-text-1">{decision}</span>
                <span className="truncate type-body-sm text-text-2">{when}</span>
              </span>
              <ScoreBadge score={score} />
            </li>
          ))}
        </ul>
      </div>

      <CardFooter>
        <div className="flex w-full justify-end gap-2 py-3">
          <Link href="/how-it-works" className={buttonVariants({ variant: "secondary" })}>
            How scoring works
          </Link>
          <Link href="/sign-up" className={buttonVariants()}>
            Start reviewing
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export function BentoSection() {
  return (
    <section
      aria-labelledby="bento-title"
      className="mx-auto flex w-full max-w-(--container) flex-col items-center gap-10 px-(--gutter-sm) py-20 sm:px-(--gutter) sm:py-30"
    >
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2
          id="bento-title"
          className="font-display text-4xl leading-tight text-balance text-text-1 sm:text-5xl"
        >
          Everything after the session ends.
        </h2>
        <p className="type-body-lg text-pretty text-text-2">
          Set up once. Each session you send becomes cards, checked against its log, due again on
          day 1, 4 and 11.
        </p>
      </div>
      <MotionProvider>
        <div className="grid w-full gap-5 md:grid-cols-2 lg:grid-cols-3">
          <SessionCard />
          <div className="flex flex-col gap-5">
            <CliCard />
            <ChecksCard />
          </div>
          <ReviewsCard />
        </div>
      </MotionProvider>
    </section>
  );
}
