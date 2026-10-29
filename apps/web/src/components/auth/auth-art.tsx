import { CardsIcon, SealCheckIcon, TerminalWindowIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Facts only from docs/ARCHITECTURE.md (Review loop) and the how-it-works page.
const loop = ["Day 1", "Day 3", "Day 7"] as const;

const scores = [
  { score: 0, body: "Back to day 1" },
  { score: 1, body: "Back to day 1" },
  { score: 2, body: "On to the next gap" },
] as const;

function Rule() {
  return <span aria-hidden className="h-px min-w-3 flex-1 bg-line-row" />;
}

/** The review loop in one card: a session becomes cards, cards come back on day 1, 3 and 7, and a 2 moves them on. */
function ReviewLoop() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>After every session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <ol className="flex items-center gap-2 type-label-sm text-text-2">
            <li className="flex flex-1 items-center gap-1.5">
              <TerminalWindowIcon weight="duotone" className="size-4 text-text-1" aria-hidden />
              Session
              <Rule />
            </li>
            <li className="flex items-center gap-1.5">
              <CardsIcon weight="duotone" className="size-4 text-text-1" aria-hidden />3 to 5 cards
            </li>
          </ol>
          <ol aria-label="Review schedule" className="flex items-center gap-2">
            {loop.map((day) => (
              <li key={day} className="flex flex-1 items-center gap-2">
                <Badge variant="outline">{day}</Badge>
                <Rule />
              </li>
            ))}
            <li>
              <Badge variant="success">
                <SealCheckIcon weight="fill" data-icon="inline-start" aria-hidden />
                Mastered
              </Badge>
            </li>
          </ol>
          <div className="flex flex-col gap-2">
            <p className="type-body-sm text-text-2">
              You explain each card back in your own words. A model scores the answer:
            </p>
            <dl className="grid grid-cols-3 gap-2">
              {scores.map(({ score, body }) => (
                <div key={score} className="flex flex-col gap-1 rounded-inner bg-well p-3">
                  <dt className="font-display text-4xl leading-none text-text-1 tabular-nums">
                    {score}
                  </dt>
                  <dd className="type-label-sm text-text-2">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The right half of the auth screens on large viewports: a watercolour study desk with cards lifting off the laptop,
 * under a card that explains the review loop. Hidden under lg; the form column stands alone on phones.
 */
export function AuthArt() {
  return (
    <aside
      aria-label="How Session Coach works"
      className="relative hidden overflow-hidden bg-page lg:flex lg:flex-col lg:items-center"
    >
      <div className="relative z-10 w-full max-w-md px-(--gutter) pt-24">
        <ReviewLoop />
      </div>
      {/* Two keyed copies: the dark one keeps its paper so the scene reads as a lit sheet on a dark page. */}
      <Image
        src="/auth/study-desk.webp"
        alt=""
        width={800}
        height={1200}
        sizes="50vw"
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl dark:hidden"
      />
      <Image
        src="/auth/study-desk-dark.webp"
        alt=""
        width={800}
        height={1200}
        sizes="50vw"
        className="absolute inset-x-0 bottom-0 mx-auto hidden w-full max-w-2xl dark:block"
      />
    </aside>
  );
}
