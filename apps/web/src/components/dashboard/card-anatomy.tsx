import { CaretRightIcon, LockSimpleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import type { Step } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";

/** `reviews.step` in words: 0 is a card never answered, then the day 1, 4 and 11 reviews. */
export const STEP_LABELS = ["New", "Day 1", "Day 4", "Day 11"] as const;

/** The reviews a card climbs after its first answer: days 1, 4 and 11, then owned. */
const LADDER = ["Day 1", "Day 4", "Day 11", "Owned"] as const;

export const DECISION_CARD =
  "A decision card is one choice your agent made in a session, with a quote from the log that proves it.";

export const ANSWER_FIRST =
  "You explain it before you see the why. Pulling it from memory is what makes it stick; reading it first only feels like learning.";

const SCHEDULE = `Each answer scores 0 (missed), 1 (partly) or 2 (explained). A 2 brings the card back on day 1, then day 4, then day 11; below 2, it steps down one and comes back tomorrow. At most ${DAILY_CAP} cards a day.`;

/**
 * The reviews a card climbs, its own step marked: passed steps done, later ones outlined. A new card (step 0) and no
 * step mark none.
 */
export function ReviewLadder({ step }: { step?: Step }) {
  const current = step ? step - 1 : -1;
  return (
    <ol aria-label="Review schedule" className="flex flex-wrap items-center gap-2">
      {LADDER.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <Badge
            variant={i < current ? "success" : i === current ? "default" : "outline"}
            aria-current={i === current ? "step" : undefined}
          >
            {label}
          </Badge>
          {i < LADDER.length - 1 && <CaretRightIcon aria-hidden="true" className="text-text-3" />}
        </li>
      ))}
    </ol>
  );
}

/** A field's value with a line on what the field is. */
function Field({ value, about }: { value: React.ReactNode; about: string }) {
  return (
    <span className="flex flex-col gap-1">
      {value}
      <span className="type-body-sm text-text-3">{about}</span>
    </span>
  );
}

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-text-3">
      <LockSimpleIcon aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * One decision card taken apart, for the dashboard's rail. Only the decision and the question are ever passed in: the
 * why and the evidence stay locked here, as they are before an answer (learners can't read them until then).
 */
export function CardAnatomy({
  card,
  sample,
}: {
  card: { decision: string; question: string; step: Step };
  /** The card is synthetic, not the learner's: marked as a sample. */
  sample?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Inside a decision card</h2>
        </CardTitle>
        <CardDescription>{DECISION_CARD}</CardDescription>
        {sample && (
          <CardAction>
            <Badge variant="outline">Sample</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListItem>
            <DataListLabel>Decision</DataListLabel>
            <DataListValue>
              <Field value={card.decision} about="What the agent chose." />
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Question</DataListLabel>
            <DataListValue>
              <Field value={card.question} about="What you answer, in your words." />
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Why</DataListLabel>
            <DataListValue>
              <Field value={<Locked>Shows after you answer.</Locked>} about={ANSWER_FIRST} />
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Next review</DataListLabel>
            <DataListValue>
              <span className="flex flex-col gap-2">
                <ReviewLadder step={card.step} />
                <span className="type-body-sm text-text-3">{SCHEDULE}</span>
              </span>
            </DataListValue>
          </DataListItem>
        </DataList>
      </CardContent>
    </Card>
  );
}
