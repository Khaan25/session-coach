"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Evidence } from "@session-coach/shared/decision";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemGroup } from "@/components/ui/item";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useFocusWhenReplaced } from "@/lib/ui/use-focus-when-replaced";

// MAX_ANSWER in lib/review/grade.ts; not imported, so zod stays out of the client bundle. The route checks it again.
const MAX_ANSWER = 4000;

/** POST /api/review/answer's success body. */
type Grade = {
  score: Score;
  missing: string;
  modelAnswer: string;
  evidence: Evidence[];
  /** YYYY-MM-DD, or null once the card is mastered. */
  nextDue: string | null;
};

/** A calendar date as the learner reads it, e.g. "Fri, Oct 30". It has no time, so it is formatted in UTC. */
const formatDue = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

async function postAnswer(cardId: string, answer: string): Promise<Grade> {
  const response = await fetch("/api/review/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cardId, answer }),
  }).catch(() => null);
  if (!response) throw new Error("Check your connection and try again.");
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Try again.");
  return body as Grade;
}

/**
 * The quiz: the card's question, the learner's explanation and, after submit, the grade. Gets only the question; the
 * answer key reaches the browser only in the grading route's response, after the answer is in.
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
  const id = useId();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  // The submit button unmounts when the result replaces the form, so focus moves to the result heading.
  const { target: resultHeading } = useFocusWhenReplaced<HTMLHeadingElement>(grade !== null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const trimmed = answer.trim();
    if (!trimmed) return setError("Write your explanation before you submit.");
    if (trimmed.length > MAX_ANSWER) return setError(`Keep it under ${MAX_ANSWER} characters.`);
    setError(null);
    setPending(true);
    toast
      .promise(postAnswer(cardId, trimmed), {
        loading: "Scoring your answer",
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
      .finally(() => setPending(false));
  }

  if (grade)
    return (
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 ref={resultHeading} tabIndex={-1}>
              Your result
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>Score</DataListLabel>
              <DataListValue>
                <ScoreBadge score={grade.score} />
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Your answer</DataListLabel>
              <DataListValue>{answer.trim()}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>What was missing</DataListLabel>
              <DataListValue>{grade.missing || "Nothing"}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Model answer</DataListLabel>
              <DataListValue>{grade.modelAnswer}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Next review</DataListLabel>
              <DataListValue>
                {grade.nextDue ? (
                  <time dateTime={grade.nextDue}>{formatDue(grade.nextDue)}</time>
                ) : (
                  "None: you've mastered this card"
                )}
              </DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <ItemGroup aria-label="Evidence">
          {grade.evidence.map((item) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={`${item.event_index}-${item.quote}`} role="listitem">
              <ItemContent>
                <blockquote className="type-body text-text-1">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <ItemDescription>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>Event E{item.event_index}</span>
                    {item.file && (
                      <Code>
                        {item.lines ? `${item.file}:${item.lines[0]}-${item.lines[1]}` : item.file}
                      </Code>
                    )}
                  </span>
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
        <CardFooter>
          <div className="flex flex-wrap gap-3">
            {nextHref && (
              <Link href={nextHref} className={buttonVariants()}>
                Next card
              </Link>
            )}
            <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
              Back to the queue
            </Link>
          </div>
        </CardFooter>
      </Card>
    );

  return (
    <form onSubmit={submit} noValidate>
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>{question}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={`${id}-answer`}>Your explanation</FieldLabel>
            <Textarea
              id={`${id}-answer`}
              rows={5}
              maxLength={MAX_ANSWER}
              // Read-only while scoring, so the answer shown with the result is the one that was scored.
              readOnly={pending}
              value={answer}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
              onChange={(event) => {
                setAnswer(event.target.value);
                // The error is about the old text; submit checks again.
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <FieldDescription id={`${id}-hint`}>
              In your own words. Submit with{" "}
              <KbdGroup>
                <Kbd>Cmd</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>{" "}
              or{" "}
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>
              .
            </FieldDescription>
            <FieldError id={`${id}-error`}>{error}</FieldError>
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Scoring" : "Submit answer"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
