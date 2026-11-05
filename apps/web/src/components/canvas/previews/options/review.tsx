"use client";

// Redesign options for the review routes: /review (today's queue, at most 5) and /review/[cardId] (answer first,
// "I don't know yet", the result with its score and the why, caught up). Each option is a different layout idea
// for the same goal: the page itself teaches what a decision card is, why the answer comes before the why, what the
// schedule (day 1, 4, 11) means, what explained and owned mean, and what to do next.
//
// Everything is synthetic. The why and the model answer appear only after an answer, as in the real grading route.

import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useState } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { IdeaNote } from "../parts";

// ---------------------------------------------------------------------------------------------------------------------
// Synthetic data. "Now" is NOW in parts.tsx: Tue, Nov 3 2026.

/** `reviews.step`: 0 never answered, then the day 1, 4 and 11 reviews. */
type Step = 0 | 1 | 2 | 3;

/** The card's ladder, plus where it ends: owned (mastered on day 11). */
const STAGES = ["New", "Day 1", "Day 4", "Day 11", "Owned"] as const;

/** One line per stage, written for someone who has never seen the schedule. */
const STAGE_HELP = [
  "New: you haven't explained it yet. It waits up to 7 days after its session, then stays only on the session's page.",
  "Day 1: the day after your first good answer. The first check that it stuck overnight.",
  "Day 4: three days after day 1. Long enough to forget what you only skimmed.",
  "Day 11: a week after day 4. Explain it right here and you own it.",
  "Owned: you explained it right on day 11. It doesn't come back.",
] as const;

type QueueRow = {
  id: string;
  decision: string;
  sessionName: string;
  step: Step;
  /** Why the card is in today's queue, in words. */
  reason: string;
};

const QUEUE: QueueRow[] = [
  {
    id: "c1",
    decision: "Rate limit the upload route per token, not per IP",
    sessionName: FRAME_SESSIONS[0].title,
    step: 1,
    reason: "Due for its day 1 review",
  },
  {
    id: "c2",
    decision: "Return 429 with a Retry-After header",
    sessionName: FRAME_SESSIONS[0].title,
    step: 2,
    reason: "Due for its day 4 review",
  },
  {
    id: "c3",
    decision: "Stream the upload body instead of buffering it",
    sessionName: FRAME_SESSIONS[3].title,
    step: 0,
    reason: "New from a session 2 days ago",
  },
];

/** What a score 2, a lower score and a skip do to a card at `step`, in words. */
function effects(step: Step) {
  const next = step === 3 ? "you own it" : `${STAGES[step + 1]} is next`;
  const down = STAGES[Math.max(step - 1, 1)];
  return {
    2: `Moves up: ${next}.`,
    1: `Back to ${down}, due tomorrow.`,
    0: `Back to ${down}, due tomorrow.`,
    skip: `Stays at ${STAGES[Math.max(step, 1)]}, due tomorrow. Costs nothing.`,
  };
}

/** The quiz's card: the second in the queue, at its day 4 review. */
const CARD = {
  ...QUEUE[1],
  path: "/review/c2",
  question: "Why does the route send Retry-After instead of only a 429?",
  why: "The CLI already backs off on Retry-After, so no client change was needed.",
  evidence: {
    quote: "The CLI already honours Retry-After, so the server only has to send the header.",
    event: 14,
    file: "apps/web/src/app/api/sessions/route.ts:12-30",
  },
};

/** The grade the route would return for each score, for this card at day 4. */
const GRADES: Record<Score, { answer: string; missing: string; next: string; step: Step }> = {
  2: {
    answer:
      "The CLI already waits for Retry-After before it retries, so sending the header meant nothing on the client had to change.",
    missing: "",
    next: "Day 11, on Tue, Nov 10",
    step: 3,
  },
  1: {
    answer: "So the client knows when it can try again.",
    missing: "That the CLI already backs off on Retry-After, so no client change was needed.",
    next: "Day 1, tomorrow (Wed, Nov 4)",
    step: 1,
  },
  0: {
    answer: "429 is the right status code for rate limiting.",
    missing:
      "Why the header matters: the CLI already backs off on it, so the client didn't change.",
    next: "Day 1, tomorrow (Wed, Nov 4)",
    step: 1,
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// Shared pieces.

/** The card's place on its ladder: passed stages done, the current one marked, the rest ahead. */
function ScheduleTrack({ step, label }: { step: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {STAGES.map((stage, i) => (
        <li key={stage} className="flex items-center gap-1.5">
          {i > 0 && <ArrowRightIcon aria-hidden className="size-3 text-text-3" />}
          {i < step ? (
            <Badge variant="success">
              <CheckIcon aria-hidden />
              {stage}
            </Badge>
          ) : i === step ? (
            <Badge aria-current="step">{stage}</Badge>
          ) : (
            <Badge variant="outline">{stage}</Badge>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Explained vs owned, the two words the dashboard meter uses. */
function ExplainedOwned() {
  return (
    <DataList>
      <DataListItem>
        <DataListLabel>Explained</DataListLabel>
        <DataListValue>You scored 2 on it at least once.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Owned</DataListLabel>
        <DataListValue>You scored 2 on its day 11 review, a week after day 4.</DataListValue>
      </DataListItem>
    </DataList>
  );
}

/** The quiz page's header: the decision, the session it came from, and where today stands. */
function QuizHeader() {
  return (
    <AppPageHeader
      title={CARD.decision}
      description={
        <>
          From{" "}
          <Link href={`/s/${FRAME_SESSIONS[0].id}`} className={buttonVariants({ variant: "link" })}>
            {CARD.sessionName}
          </Link>
        </>
      }
      actions={<Badge variant="outline">Card 2 of 3 today</Badge>}
    />
  );
}

/** The explanation box: no paste, submit from the keyboard. */
function AnswerField({
  value,
  onChange,
  hint,
  error,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  hint?: React.ReactNode;
  /** What the route or the field check said, under the box, as the real quiz shows it. */
  error?: string;
  /** While scoring, so the answer shown with the result is the one scored. */
  readOnly?: boolean;
}) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Your explanation</FieldLabel>
      <Textarea
        id={id}
        rows={5}
        value={value}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldDescription>
        {hint ?? "Type it in your own words. Paste is off here."} Submit with{" "}
        <KbdGroup>
          <Kbd>Cmd</Kbd>
          <Kbd>Enter</Kbd>
        </KbdGroup>
        .
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function Evidence() {
  return (
    <Item variant="muted">
      <ItemContent>
        <blockquote className="type-body text-text-1">
          &ldquo;{CARD.evidence.quote}&rdquo;
        </blockquote>
        <ItemDescription>
          <span className="flex flex-wrap items-center gap-2">
            <span>Event E{CARD.evidence.event} in your session</span>
            <Code>{CARD.evidence.file}</Code>
          </span>
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

export type QuizStage = "answer" | "skipped" | "result" | "caught-up";
type Stage = QuizStage;

/** One quiz walk-through: the stage, the score the canvas pretends the grader gave, and the typed answer. */
function useQuizWalk(initial: { stage?: Stage; score?: Score; answer?: string }) {
  const [stage, setStage] = useState<Stage>(initial.stage ?? "answer");
  const [score, setScore] = useState<Score>(initial.score ?? 1);
  const [answer, setAnswer] = useState(initial.answer ?? "");
  // The result shows the typed answer when there is one, else the sample for the score.
  const shown = answer.trim() || GRADES[score].answer;
  return { stage, setStage, score, setScore, answer, setAnswer, shown };
}

/** The canvas control above the app: which state to show, and the score for the result. */
function StageBar({
  stage,
  setStage,
  score,
  setScore,
}: Pick<ReturnType<typeof useQuizWalk>, "stage" | "setStage" | "score" | "setScore">) {
  const id = useId();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-dashed border-hair bg-well px-4 py-2">
      <Badge variant="warning">Canvas control</Badge>
      <span id={`${id}-stage`} className="type-label-sm text-text-2">
        State
      </span>
      <SegmentedControl
        size="xs"
        aria-labelledby={`${id}-stage`}
        value={stage}
        onValueChange={(v) => setStage(v as Stage)}
      >
        <SegmentedControlItem value="answer">Answer first</SegmentedControlItem>
        <SegmentedControlItem value="skipped">I don&rsquo;t know yet</SegmentedControlItem>
        <SegmentedControlItem value="result">Result</SegmentedControlItem>
        <SegmentedControlItem value="caught-up">Caught up</SegmentedControlItem>
      </SegmentedControl>
      {stage === "result" && (
        <>
          <span id={`${id}-score`} className="type-label-sm text-text-2">
            Score
          </span>
          <SegmentedControl
            size="xs"
            aria-labelledby={`${id}-score`}
            value={String(score)}
            onValueChange={(v) => setScore(Number(v) as Score)}
          >
            <SegmentedControlItem value="2">2 Explained</SegmentedControlItem>
            <SegmentedControlItem value="1">1 Partly</SegmentedControlItem>
            <SegmentedControlItem value="0">0 Missed</SegmentedControlItem>
          </SegmentedControl>
        </>
      )}
    </div>
  );
}

/** After the last card: what happened today and what comes next, so the empty page still says what to do. */
function QuizCaughtUp() {
  return (
    <EmptyState
      icon={CalendarCheckIcon}
      sprite="tea"
      title="That was today's last card"
      description="Your next card is due tomorrow, for its day 1 review. New cards arrive when your next session ends. Coming back each day matters more than doing many at once, so the queue stops at 5."
      action={
        <>
          <Link href="/progress" className={buttonVariants({ variant: "secondary" })}>
            See your progress
          </Link>
          <Link href="/defend" className={buttonVariants({ variant: "ghost" })}>
            Defend it, optional
          </Link>
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /review, option B: split explain-as-you-go. The queue on the left; the panel on the right explains whichever card
// is picked: where it is on the ladder and what each answer would do to it.

export function ReviewQueueOptionB() {
  const [picked, setPicked] = useState(QUEUE[1].id);
  const card = QUEUE.find((c) => c.id === picked) ?? QUEUE[0];
  const fx = effects(card.step);
  return (
    <AppFrame path="/review">
      <Container>
        <AppPageHeader
          title="Review"
          description="Pick a card to see where it is and what your answer will do to it."
          actions={
            <Link href={`/review/${QUEUE[0].id}`} className={buttonVariants()}>
              Start review
            </Link>
          }
        />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Due today</h2>
                </CardTitle>
                <CardDescription>
                  3 of 5. The queue stops at 5 a day, so it never piles up.
                </CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-1 p-2">
                {QUEUE.map((row) => (
                  <Item
                    key={row.id}
                    selected={row.id === picked}
                    render={
                      <button type="button" aria-label={`${row.decision}, ${STAGES[row.step]}`} />
                    }
                    onClick={() => setPicked(row.id)}
                  >
                    <ItemContent>
                      <ItemTitle>{row.decision}</ItemTitle>
                      <ItemDescription>{row.sessionName}</ItemDescription>
                    </ItemContent>
                    <Badge variant={row.step === 0 ? "outline" : "default"}>
                      {STAGES[row.step]}
                    </Badge>
                  </Item>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>What a decision card is</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>Decision</DataListLabel>
                    <DataListValue>One choice your agent made in a session.</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Question</DataListLabel>
                    <DataListValue>What you explain back, in your own words.</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Why</DataListLabel>
                    <DataListValue>
                      <span className="flex items-center gap-2">
                        <LockSimpleIcon aria-hidden />
                        Locked until you answer, then shown with the quote it came from.
                      </span>
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>This card</h2>
                </CardTitle>
                <CardDescription>{card.reason}.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <ScheduleTrack step={card.step} label={`Where "${card.decision}" is`} />
                  <p className="type-body-sm text-text-2">{STAGE_HELP[card.step]}</p>
                  <DataList>
                    <DataListItem>
                      <DataListLabel>
                        <ScoreBadge score={2} />
                      </DataListLabel>
                      <DataListValue>{fx[2]}</DataListValue>
                    </DataListItem>
                    <DataListItem>
                      <DataListLabel>
                        <span className="flex gap-1">
                          <ScoreBadge score={1} />
                          <ScoreBadge score={0} />
                        </span>
                      </DataListLabel>
                      <DataListValue>{fx[1]}</DataListValue>
                    </DataListItem>
                    <DataListItem>
                      <DataListLabel>I don&rsquo;t know yet</DataListLabel>
                      <DataListValue>{fx.skip}</DataListValue>
                    </DataListItem>
                  </DataList>
                </div>
              </CardContent>
              <CardFooter>
                <Link
                  href={`/review/${card.id}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Answer this card
                </Link>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Explained vs owned</h2>
                </CardTitle>
                <CardDescription>Explained 9 · owned 2 of 30 in session-coach.</CardDescription>
              </CardHeader>
              <CardContent>
                <ExplainedOwned />
              </CardContent>
            </Card>
          </div>
        </div>
        <IdeaNote>
          Option B, split explain-as-you-go: the right panel follows the picked row, so the schedule
          and the scores are explained on the card they apply to, not in a docs page.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /review/[cardId], option B: split explain-as-you-go. The work on the left; on the right, notes that explain each
// part of the screen as it changes: what this card is, what each score does, where the card moves.

export function ReviewCardOptionB({
  stage: initialStage,
  score: initialScore,
  answer: initialAnswer,
  pending,
  error,
  controls = true,
  overlay,
}: {
  stage?: Stage;
  score?: Score;
  answer?: string;
  /** A request in flight: the buttons say what they are doing, as the real quiz's do. */
  pending?: "answer" | "skip";
  error?: string;
  /** The canvas's state switcher above the app. Off for a fixed state. */
  controls?: boolean;
  /** Drawn over the window, such as the toast the real quiz raises. */
  overlay?: React.ReactNode;
} = {}) {
  const walk = useQuizWalk({ stage: initialStage, score: initialScore, answer: initialAnswer });
  const { stage, setStage, score, answer, setAnswer, shown } = walk;
  const grade = GRADES[score];
  const fx = effects(CARD.step);
  const answered = stage === "result" || stage === "skipped";
  return (
    <AppFrame path={CARD.path} bar={controls && <StageBar {...walk} />} overlay={overlay}>
      <Container>
        {stage === "caught-up" ? (
          <>
            <AppPageHeader title="Review" />
            <QuizCaughtUp />
          </>
        ) : (
          <>
            <QuizHeader />
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="flex flex-col gap-6 lg:col-span-3">
                <Card size="lg">
                  <CardHeader>
                    <CardTitle>
                      <h2>{CARD.question}</h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stage === "answer" ? (
                      <AnswerField
                        value={answer}
                        onChange={setAnswer}
                        error={error}
                        readOnly={pending !== undefined}
                      />
                    ) : (
                      <DataList>
                        {stage === "result" && (
                          <>
                            <DataListItem>
                              <DataListLabel>Score</DataListLabel>
                              <DataListValue>
                                <ScoreBadge score={score} />
                              </DataListValue>
                            </DataListItem>
                            <DataListItem>
                              <DataListLabel>Your answer</DataListLabel>
                              <DataListValue>{shown}</DataListValue>
                            </DataListItem>
                            <DataListItem>
                              <DataListLabel>What was missing</DataListLabel>
                              <DataListValue>{grade.missing || "Nothing"}</DataListValue>
                            </DataListItem>
                          </>
                        )}
                        <DataListItem>
                          <DataListLabel>Why</DataListLabel>
                          <DataListValue>{CARD.why}</DataListValue>
                        </DataListItem>
                        <DataListItem>
                          <DataListLabel>Next review</DataListLabel>
                          <DataListValue>
                            {stage === "skipped" ? "Day 4, tomorrow (Wed, Nov 4)" : grade.next}
                          </DataListValue>
                        </DataListItem>
                      </DataList>
                    )}
                  </CardContent>
                  <CardFooter>
                    {stage === "answer" ? (
                      <div className="flex flex-wrap gap-3">
                        <Button disabled={!!pending} onClick={() => setStage("result")}>
                          {pending === "answer" ? "Scoring" : "Submit answer"}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!!pending}
                          onClick={() => setStage("skipped")}
                        >
                          {pending === "skip" ? "Showing the why" : "I don’t know yet"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setStage("caught-up")}>Next card</Button>
                        <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
                          Back to the queue
                        </Link>
                      </div>
                    )}
                  </CardFooter>
                </Card>
                {answered && <Evidence />}
              </div>
              <div className="flex flex-col gap-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>What you&rsquo;re looking at</h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataList>
                      <DataListItem>
                        <DataListLabel>Decision card</DataListLabel>
                        <DataListValue>
                          One choice your agent made in a session, backed by a quote from it.
                        </DataListValue>
                      </DataListItem>
                      <DataListItem>
                        <DataListLabel>The why</DataListLabel>
                        <DataListValue>
                          <span className="flex items-center gap-2">
                            {answered ? (
                              <LockSimpleOpenIcon aria-hidden />
                            ) : (
                              <LockSimpleIcon aria-hidden />
                            )}
                            {answered
                              ? "Unlocked by your answer. Compare it with what you wrote."
                              : "Locked. Explaining first tests what you remember, not what you just read."}
                          </span>
                        </DataListValue>
                      </DataListItem>
                    </DataList>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>What your answer does</h2>
                    </CardTitle>
                    <CardDescription>This card is at Day 4 today.</CardDescription>
                  </CardHeader>
                  <div className="flex flex-col gap-1 p-2">
                    {([2, 1, 0] as const).map((s) => (
                      <Item key={s} size="sm" selected={stage === "result" && score === s}>
                        <ItemMedia>
                          <ScoreBadge score={s} />
                        </ItemMedia>
                        <ItemContent>
                          <ItemDescription>{fx[s]}</ItemDescription>
                        </ItemContent>
                      </Item>
                    ))}
                    <Item size="sm" selected={stage === "skipped"}>
                      <ItemMedia>
                        <Badge variant="outline">Don&rsquo;t know</Badge>
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>{fx.skip}</ItemDescription>
                      </ItemContent>
                    </Item>
                  </div>
                  <CardFooter>
                    <div className="py-2">
                      <ScheduleTrack
                        step={stage === "result" ? grade.step : CARD.step}
                        label="Where this card is"
                      />
                    </div>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>Explained vs owned</h2>
                    </CardTitle>
                    <CardDescription>
                      You&rsquo;ve explained this card. One more 2, on day 11, and you own it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExplainedOwned />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
        <IdeaNote>
          Option B, split explain-as-you-go: the right rail annotates the screen and changes with
          it. The lock opens on answer, and the row for the score just given lights up.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}
