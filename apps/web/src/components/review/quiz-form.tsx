"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { mockRequest } from "@/lib/sample/mock-request";

type Grade = { score: Score; missing: string; nextDue: string; nextDueLabel: string };

const MAX_ANSWER = 4000;

/**
 * The quiz: the card's question, the learner's explanation and, after submit, the grade. Gets only the question and a
 * sample grade; the answer key reaches the browser only in the grading route's response, after the answer is in.
 */
export function QuizForm({
  question,
  sampleGrade,
}: {
  question: string;
  /** SAMPLE: what the mock submit shows. TODO(zia): drop once the grading route exists. */
  sampleGrade: Grade;
}) {
  const id = useId();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return setError("Write your explanation before you submit.");
    if (trimmed.length > MAX_ANSWER) return setError(`Keep it under ${MAX_ANSWER} characters.`);
    setError(null);
    // TODO(zia): mock submit. POST /api/review/answer { cardId, answer } and show its { score, missing, modelAnswer,
    // nextDue }; 503 when the model env vars are unset, 502 when grading fails twice.
    toast
      .promise(mockRequest(sampleGrade, 1200), {
        loading: "Scoring your answer",
        success: (result) => {
          setGrade(result);
          return {
            type: "success",
            title: "Answer scored",
            description: "Your score and next review are below.",
          };
        },
        error: "Your answer couldn't be scored. It's still in the box; try again.",
      })
      .catch(() => {});
  }

  if (grade)
    return (
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Your result</h2>
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
              <DataListValue>{grade.missing}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Model answer</DataListLabel>
              {/* TODO(zia): modelAnswer and the card's evidence from the grading route's response, after submit. */}
              <DataListValue>
                TODO(zia): comes from the grading route after you submit.
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Next review</DataListLabel>
              <DataListValue>
                <time dateTime={grade.nextDue}>{grade.nextDueLabel}</time>
              </DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <CardFooter>
          <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
            Back to the queue
          </Link>
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
          <Button type="submit">Submit answer</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
