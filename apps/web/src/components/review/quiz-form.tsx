"use client";

import { createContext, use, useId, useState } from "react";
import Link from "next/link";
import type { Evidence } from "@session-coach/shared/decision";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Stat, StatDescription, StatLabel, StatValue } from "@/components/ui/stat";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useFocusWhenReplaced } from "@/lib/ui/use-focus-when-replaced";

// MAX_ANSWER in lib/review/grade.ts; not imported, so zod stays out of the client bundle. The route checks it again.
const MAX_ANSWER = 4000;

/** POST /api/review/answer's success body. */
export type Grade = {
  score: Score;
  missing: string;
  why: string;
  modelAnswer: string;
  evidence: Evidence[];
  /** YYYY-MM-DD, or null once the card is mastered. */
  nextDue: string | null;
  /** True when a miss moved the card down a step. A skip never does. */
  dropped: boolean;
};

type Attempt = { answer: string } | { dontKnow: true };

export const PASTE_OFF = "Paste is off here. Type it in your own words.";

/** A calendar date as the learner reads it, e.g. "Fri, Oct 30". It has no time, so it is formatted in UTC. */
const formatDue = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

/** Sends an explanation, or `{ dontKnow: true }` for an honest skip. */
async function postAnswer(cardId: string, attempt: Attempt): Promise<Grade> {
  const response = await fetch("/api/review/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cardId, ...attempt }),
  }).catch(() => null);
  if (!response) throw new Error("Check your connection and try again.");
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Try again.");
  return body as Grade;
}

/**
 * How an answer reaches the grader: the route by default. /canvas provides a stand-in, so a quiz drawn there never
 * calls the API.
 */
export const QuizSendContext =
  createContext<(cardId: string, attempt: Attempt) => Promise<Grade>>(postAnswer);

/**
 * The quiz: the card's question, the learner's explanation and, after submit, the grade. Gets only the question; the
 * why and the answer key reach the browser only in the grading route's response, after the answer is in.
 * "I don't know yet" is an honest skip: no score to fear, the why is shown, and the card comes back tomorrow at the
 * same level, so there is no reason to guess or paste the question into an AI.
 */
export function QuizForm({
  cardId,
  question,
  nextHref,
}: {
  cardId: string;
  question: string;
  /** The next card in the queue, or null when this was the last. */
  nextHref: string | null;
}) {
  const send = use(QuizSendContext);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Which request is in flight, so each button says what it is doing.
  const [pending, setPending] = useState<"answer" | "skip" | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [skipped, setSkipped] = useState(false);
  // The submit button unmounts when the result replaces the form, so focus moves to the result heading.
  const { target: resultHeading } = useFocusWhenReplaced<HTMLHeadingElement>(grade !== null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending !== null) return;
    const trimmed = answer.trim();
    if (!trimmed) return setError("Write your explanation before you submit.");
    if (trimmed.length > MAX_ANSWER) return setError(`Keep it under ${MAX_ANSWER} characters.`);
    setError(null);
    setPending("answer");
    toast
      .promise(send(cardId, { answer: trimmed }), {
        loading: "Scoring your answer…",
        success: (result) => {
          setGrade(result);
          return {
            type: "success",
            title: "Answer scored",
            description: "Your score and next review are below.",
          };
        },
        error: (reason: unknown) => {
          const message = reason instanceof Error ? reason.message : "Try again.";
          setError(message);
          return {
            title: "Your answer couldn't be scored",
            description: `It's still in the box. ${message}`,
          };
        },
      })
      .catch(() => {})
      .finally(() => setPending(null));
  }

  function skip() {
    if (pending !== null) return;
    setError(null);
    setPending("skip");
    send(cardId, { dontKnow: true })
      .then((result) => {
        setSkipped(true);
        setGrade(result);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Try again.");
      })
      .finally(() => setPending(null));
  }

  // Client-side only: it nudges people to recall, it doesn't stop a determined one (devtools, typing it out). The
  // keyboard and screen readers work as before; a blocked paste or drop says why in the field's error.
  function blockPaste(event: React.ClipboardEvent | React.DragEvent) {
    event.preventDefault();
    setError(PASTE_OFF);
  }

  if (grade)
    return (
      <QuizResult
        grade={grade}
        answer={answer}
        skipped={skipped}
        nextHref={nextHref}
        headingRef={resultHeading}
      />
    );

  return (
    <QuizAnswer
      question={question}
      answer={answer}
      error={error}
      pending={pending}
      onAnswerChange={(value) => {
        setAnswer(value);
        // The error is about the old text; submit checks again.
        setError(null);
      }}
      onSubmit={submit}
      onSkip={skip}
      onBlockedPaste={blockPaste}
    />
  );
}

/** The grade, the why and the model answer, once the answer is in. `skipped` is "I don't know yet": no score. */
export function QuizResult({
  grade,
  answer,
  skipped,
  nextHref,
  headingRef,
}: {
  grade: Grade;
  answer: string;
  skipped: boolean;
  nextHref: string | null;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    // motion-safe: the reduced-motion reset only reaches [data-slot] parts, and this wrapper has none.
    <div className="motion-safe:animate-enter">
      {/* Top-down: the score, what was missing, the why and the model answer, the evidence, then the next step. */}
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 ref={headingRef} tabIndex={-1}>
              {skipped ? "Here's the why" : "Your result"}
            </h2>
          </CardTitle>
          {skipped ? (
            <CardDescription>
              Not knowing yet is fine. This card comes back tomorrow at the same level.
            </CardDescription>
          ) : (
            grade.dropped && (
              <CardDescription>This card dropped a level. It comes back tomorrow.</CardDescription>
            )
          )}
        </CardHeader>
        <CardContent>
          {/* A plain row, not a StatGroup: its cells are inset, which pulled the stats off the list's left edge. */}
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            {!skipped && (
              <Stat>
                <StatLabel>Score</StatLabel>
                <StatValue>{grade.score} of 2</StatValue>
                <StatDescription>
                  <ScoreBadge score={grade.score} />
                </StatDescription>
              </Stat>
            )}
            <Stat>
              <StatLabel>Next review</StatLabel>
              <StatValue>
                {grade.nextDue ? (
                  <time dateTime={grade.nextDue}>{formatDue(grade.nextDue)}</time>
                ) : (
                  "None"
                )}
              </StatValue>
              {!grade.nextDue && <StatDescription>You&rsquo;ve mastered this card</StatDescription>}
            </Stat>
          </div>
          <DataList variant="divided" orientation="vertical">
            {!skipped && (
              <DataListItem>
                <DataListLabel>What was missing</DataListLabel>
                <DataListValue>{grade.missing || "Nothing"}</DataListValue>
              </DataListItem>
            )}
            <DataListItem>
              <DataListLabel>Why</DataListLabel>
              <DataListValue>{grade.why}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Model answer</DataListLabel>
              <DataListValue>{grade.modelAnswer}</DataListValue>
            </DataListItem>
            {!skipped && (
              <DataListItem>
                <DataListLabel>Your answer</DataListLabel>
                <DataListValue>{answer.trim()}</DataListValue>
              </DataListItem>
            )}
            {grade.evidence.length > 0 && (
              <DataListItem>
                <DataListLabel>Evidence</DataListLabel>
                <DataListValue>
                  <ul aria-label="Evidence" className="flex w-full flex-col gap-3">
                    {grade.evidence.map((item) => (
                      <li key={`${item.event_index}-${item.quote}`} className="flex flex-col gap-1">
                        <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
                        <span className="flex flex-wrap items-center gap-2 type-body-sm text-text-2">
                          <span>Event E{item.event_index}</span>
                          {item.file && (
                            <Code>
                              {item.lines
                                ? `${item.file}:${item.lines[0]}-${item.lines[1]}`
                                : item.file}
                            </Code>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </DataListValue>
              </DataListItem>
            )}
          </DataList>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            {/* Row-reverse keeps the primary first for focus and stacking, and last (rightmost) on a wide screen. */}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              {nextHref && (
                <Link href={nextHref} transitionTypes={["forward"]} className={buttonVariants()}>
                  Next card
                </Link>
              )}
              <Link
                href="/review"
                transitionTypes={["back"]}
                className={buttonVariants({ variant: nextHref ? "secondary" : "default" })}
              >
                Back to the queue
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

/** The question and the answer box: as the learner types, after a blocked paste, or while scoring. */
export function QuizAnswer({
  question,
  answer,
  error,
  pending,
  onAnswerChange,
  onSubmit,
  onSkip,
  onBlockedPaste,
}: {
  question: string;
  answer: string;
  error: string | null;
  /** Which request is in flight, so each button says what it is doing. */
  pending: "answer" | "skip" | null;
  onAnswerChange?: (value: string) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onSkip?: () => void;
  onBlockedPaste?: (event: React.ClipboardEvent | React.DragEvent) => void;
}) {
  const id = useId();
  return (
    <form onSubmit={onSubmit} noValidate>
      <Card size="lg">
        <CardContent>
          <div className="flex flex-col gap-5">
            <h2 className="type-heading-sm text-balance">{question}</h2>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${id}-answer`}>Your explanation</FieldLabel>
              <Textarea
                id={`${id}-answer`}
                rows={5}
                maxLength={MAX_ANSWER}
                // Read-only while scoring, so the answer shown with the result is the one that was scored.
                readOnly={pending !== null}
                value={answer}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
                aria-keyshortcuts="Meta+Enter Control+Enter"
                onChange={(event) => onAnswerChange?.(event.target.value)}
                onPaste={onBlockedPaste}
                onDrop={onBlockedPaste}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <FieldDescription id={`${id}-hint`}>
                Type it in your own words. Paste is off here.
              </FieldDescription>
              <FieldError id={`${id}-error`}>{error}</FieldError>
            </Field>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Phones have no Enter shortcut to show, so the hint is for wider screens only. */}
            <p className="hidden type-body-sm text-text-3 sm:block">
              <KbdGroup>
                <Kbd>Cmd</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>{" "}
              or{" "}
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>{" "}
              to submit
            </p>
            {/* Row-reverse keeps the primary first for focus and stacking, and last (rightmost) on a wide screen. */}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="submit" disabled={pending !== null}>
                {pending === "answer" ? "Scoring…" : "Submit answer"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending !== null}
                onClick={onSkip}
              >
                {pending === "skip" ? "Showing the why…" : "I don’t know yet"}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
