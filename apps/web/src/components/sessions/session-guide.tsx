import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// The guide on /s/[id]: numbered marks on parts of the page, and a rail whose notes explain each mark. The notes are
// fixed copy about how Session Coach works; they never carry a card's data, so the rail shows nothing the page can't.

export type SessionGuideState = "processing" | "ready" | "failed" | "no-cards";

type Note = { title: string; body: string };

const NOTES: Record<SessionGuideState, Note[]> = {
  processing: [
    {
      title: "What is happening",
      body: "The session is read for the choices your agent made and why. This page updates on its own when it's done, so you don't need to stay.",
    },
    {
      title: "What you will get",
      body: "Up to 5 decision cards shaped like the outline: the decision and a question first, the why once you answer.",
    },
    {
      title: "How each card is checked",
      body: "A card is kept only when an exact quote of at least 5 words from the session backs it.",
    },
  ],
  ready: [
    {
      title: "A decision card",
      body: "One choice your agent made in this session, with a question about why. Up to 5 per session.",
    },
    {
      title: "The score",
      body: "Each answer is scored Missed, Partly or Explained. Explained means you gave the why in your own words.",
    },
    {
      title: "The why and its quote",
      body: "Every card is backed by an exact quote from the session, checked word for word. A quote that doesn't match shows Not verified and flags the card; a card with no matching quote isn't shown.",
    },
    {
      title: "The schedule",
      body: "Explained moves a card on: day 1, day 4, then day 11. Explained on day 11 and you own it. Partly or Missed moves it a step back, due tomorrow.",
    },
    {
      title: "Answer first",
      body: "A card's why, source and quote open only after you answer, so you find out what you remember. I don't know yet is fine: it shows the why and the card comes back tomorrow. Defend it, later, is optional.",
    },
  ],
  failed: [
    {
      title: "What failed",
      body: "Making cards from this session didn't finish, so it has no cards. The message on the left says why.",
    },
    {
      title: "How to retry",
      body: "Push the session again from its project folder: it starts over from the beginning, and this page follows it. --latest sends the project's newest session; for an older one, pass its file to session-coach push.",
    },
  ],
  "no-cards": [
    {
      title: "Why there are none",
      body: "Every card needs an exact quote from the session that backs it. This session had no decision with one, so none were kept.",
    },
    {
      title: "What gives the most cards",
      body: "Sessions where you and your agent talk through options: this approach or that one, and why.",
    },
  ],
};

/** A numbered mark on the page; the rail's note with the same number explains it. */
export function Mark({ n }: { n: number }) {
  return (
    <Badge variant="outline">
      <span className="sr-only">Note </span>
      {n}
    </Badge>
  );
}

/** A block with its mark beside it. With no mark, the block alone. */
export function Marked({ mark, children }: { mark?: React.ReactNode; children: React.ReactNode }) {
  if (!mark) return children;
  return (
    <div className="flex items-start gap-3">
      {mark}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** The page's content on the left, the guide rail on the right (below it on small screens). */
export function SessionGuideLayout({
  state,
  children,
}: {
  state: SessionGuideState;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{children}</div>
      <GuideRail state={state} />
    </div>
  );
}

function GuideRail({ state }: { state: SessionGuideState }) {
  return (
    <aside aria-labelledby="session-guide-title" className="flex flex-col gap-3">
      <p id="session-guide-title" className="type-label-sm text-text-3">
        How to read this page
      </p>
      <ol className="flex flex-col gap-3">
        {NOTES[state].map((note, i) => (
          <li key={note.title} className="flex gap-3 well p-3">
            <Mark n={i + 1} />
            <span className="flex flex-col gap-1">
              <span className="type-label text-text-1">{note.title}</span>
              <span className="type-body-sm text-text-2">{note.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** The outline of a card still being made: where the decision (mark 2) and its quote (mark 3) will be. */
export function CardOutline() {
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-3">
            <Mark n={2} />
            <Skeleton className="h-5 w-2/3" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <span className="flex items-center gap-3">
            <Mark n={3} />
            <Skeleton className="h-4 w-1/3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** The review path from README.md: a first answer, then days 1, 4 and 11, then owned. */
const STEPS = ["First answer", "Day 1", "Day 4", "Day 11", "Owned"] as const;

/** The path every card follows, as a legend: no step is current, since this page doesn't read a card's schedule. */
export function ReviewPath() {
  return (
    <ol
      aria-label="The review path every card follows"
      className="flex flex-wrap items-center gap-2"
    >
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <Badge variant="outline">{step}</Badge>
          {i < STEPS.length - 1 && <ArrowRightIcon aria-hidden className="text-text-3" />}
        </li>
      ))}
    </ol>
  );
}
