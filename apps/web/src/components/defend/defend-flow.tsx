"use client";

import { ProhibitIcon, ShieldCheckIcon, TimerIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

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
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { clockOffset, formatClock, secondsLeft } from "@/lib/defend/clock";
import { useFocusWhenReplaced } from "@/lib/ui/use-focus-when-replaced";

// MAX_ANSWER in lib/review/grade.ts; not imported, so zod stays out of the client bundle. The routes check it again.
const MAX_ANSWER = 4000;
const PASTE_OFF = "Paste is off in Defend it. Type it in your own words.";

/** The routes' success bodies (see app/api/defend). Every time is the server's. */
type Started = { defenseId: string; question: string; answerDueAt: string; serverNow: string };
type FollowUp = { followUpQuestion: string; followUpDueAt: string; serverNow: string };
type Graded = { score: Score; missing: string; label: string };

type Step =
  | { kind: "ready" }
  | {
      kind: "answering" | "follow-up";
      defenseId: string;
      question: string;
      dueAt: string;
      offset: number;
    }
  | { kind: "graded"; result: Graded }
  | { kind: "time-up" };

/** Thrown for a 409 the learner can only answer by starting again: the time ran out, or the defense moved on. */
class Conflict extends Error {}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!response) throw new Error("Check your connection and try again.");
  const data = await response.json().catch(() => null);
  if (response.status === 409) throw new Conflict(data?.error ?? "Start again.");
  if (!response.ok) throw new Error(data?.error ?? "Try again.");
  return data as T;
}

/**
 * Re-renders every quarter second while `dueAt` is set, and returns the whole seconds left by the server's clock: null
 * until the first tick, since render can't read the clock (it would be frozen at prerender).
 */
function useSecondsLeft(dueAt: string | null, offset: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!dueAt) return;
    const tick = () => setNow(Date.now());
    // The first frame catches `now` up from whenever it last ticked, so a new clock never starts from a stale time.
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, [dueAt]);
  return dueAt && now !== null ? secondsLeft(dueAt, offset, now) : null;
}

/**
 * Defend it: start, a 3 minute answer, one AI follow-up with 2 minutes, then the grade. The question, the follow-up and
 * the grade all come from the routes; the browser never sees the answer key. At 0:00 whatever is typed is sent, and the
 * server's 5 s grace takes it; an empty box ends the defense. "Defended (timed, follow-up)" shows only for a 2.
 */
export function DefendFlow({ defendable }: { defendable: number }) {
  const id = useId();
  const [step, setStep] = useState<Step>({ kind: "ready" });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timed = step.kind === "answering" || step.kind === "follow-up" ? step : null;
  const left = useSecondsLeft(timed?.dueAt ?? null, timed?.offset ?? 0);
  const { target: resultHeading } = useFocusWhenReplaced<HTMLHeadingElement>(
    step.kind === "graded" || step.kind === "time-up",
  );
  const field = useRef<HTMLTextAreaElement>(null);
  // Each new question starts with an empty box and the cursor in it.
  useEffect(() => {
    if (timed) field.current?.focus();
  }, [timed?.question]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    if (pending) return;
    setPending(true);
    setError(null);
    post<Started>("/api/defend/start")
      .then((started) => {
        setAnswer("");
        setStep({
          kind: "answering",
          defenseId: started.defenseId,
          question: started.question,
          dueAt: started.answerDueAt,
          offset: clockOffset(started.serverNow, Date.now()),
        });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Try again."))
      .finally(() => setPending(false));
  }

  function send(current: NonNullable<typeof timed>, text: string) {
    setPending(true);
    setError(null);
    const done = () => setPending(false);
    const failed = (reason: unknown) => {
      if (reason instanceof Conflict) setStep({ kind: "time-up" });
      else setError(reason instanceof Error ? reason.message : "Try again.");
    };
    if (current.kind === "answering") {
      post<FollowUp>(`/api/defend/${current.defenseId}/answer`, { answer: text })
        .then((next) => {
          setAnswer("");
          setStep({
            kind: "follow-up",
            defenseId: current.defenseId,
            question: next.followUpQuestion,
            dueAt: next.followUpDueAt,
            offset: clockOffset(next.serverNow, Date.now()),
          });
        })
        .catch(failed)
        .finally(done);
    } else {
      post<Graded>(`/api/defend/${current.defenseId}/follow-up`, { answer: text })
        .then((result) => setStep({ kind: "graded", result }))
        .catch(failed)
        .finally(done);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timed || pending) return;
    const trimmed = answer.trim();
    if (!trimmed) return setError("Write your answer before you send it.");
    if (trimmed.length > MAX_ANSWER) return setError(`Keep it under ${MAX_ANSWER} characters.`);
    send(timed, trimmed);
  }

  // At 0:00 the box locks and what's typed goes in; nothing typed means the time is simply up.
  const expired = timed !== null && left === 0;
  const onDeadline = useEffectEvent(() => {
    if (!timed || pending) return;
    const trimmed = answer.trim().slice(0, MAX_ANSWER);
    if (trimmed) send(timed, trimmed);
    else setStep({ kind: "time-up" });
  });
  useEffect(() => {
    if (!timed) return;
    const ms = new Date(timed.dueAt).getTime() - (Date.now() + timed.offset);
    const id = setTimeout(onDeadline, Math.max(0, ms));
    return () => clearTimeout(id);
  }, [timed?.dueAt, timed?.offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side only: it raises the bar, it doesn't stop a determined learner, so the label never says "verified".
  function blockPaste(event: React.ClipboardEvent | React.DragEvent) {
    event.preventDefault();
    setError(PASTE_OFF);
  }

  if (step.kind === "ready")
    return (
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <ShieldCheckIcon aria-hidden="true" />
              Defend a decision
            </h2>
          </CardTitle>
          <CardDescription>
            We pick one decision you&rsquo;ve explained right at random. You get 3 minutes, no
            paste, then one follow-up question with 2 more, like an interview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>From</DataListLabel>
              <DataListValue>
                {defendable} {defendable === 1 ? "decision" : "decisions"} you explained right
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Counts as</DataListLabel>
              <DataListValue>
                Defended (timed, follow-up) when you score 2. Never &ldquo;verified&rdquo;.
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Your reviews</DataListLabel>
              <DataListValue>
                Not affected: a defense never moves a card&rsquo;s schedule.
              </DataListValue>
            </DataListItem>
          </DataList>
          {error && <FieldError className="mt-4">{error}</FieldError>}
        </CardContent>
        <CardFooter>
          <Button onClick={start} disabled={pending}>
            {pending ? "Picking a decision" : "Start the timer"}
          </Button>
        </CardFooter>
      </Card>
    );

  if (step.kind === "graded" || step.kind === "time-up") {
    const result = step.kind === "graded" ? step.result : null;
    const defended = result?.score === 2;
    return (
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 ref={resultHeading} tabIndex={-1}>
              {!result ? "Time's up" : defended ? "Defended" : "Not defended this time"}
            </h2>
          </CardTitle>
          <CardDescription>
            {!result
              ? "Nothing was sent before the clock ran out, so this one ends here. Start again for another decision."
              : defended
                ? "Defended (timed, follow-up)."
                : "Explain it again in your next review, then defend it again."}
          </CardDescription>
        </CardHeader>
        {result && (
          <CardContent>
            <DataList>
              <DataListItem>
                <DataListLabel>Score</DataListLabel>
                <DataListValue>
                  <ScoreBadge score={result.score} />
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>What was missing</DataListLabel>
                <DataListValue>{result.missing || "Nothing"}</DataListValue>
              </DataListItem>
            </DataList>
          </CardContent>
        )}
        <CardFooter>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setStep({ kind: "ready" });
                start();
              }}
              disabled={pending}
            >
              Defend another
            </Button>
            <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
              Back to dashboard
            </Link>
          </div>
        </CardFooter>
      </Card>
    );
  }

  const current = step;
  const followUp = current.kind === "follow-up";
  return (
    <form onSubmit={submit} noValidate>
      <Card size="lg">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{followUp ? "Follow-up" : "Question 1 of 2"}</Badge>
            <Badge variant={left !== null && left <= 30 ? "warning" : "outline"}>
              <TimerIcon aria-hidden="true" />
              <span className="tabular-nums">{left === null ? "-:--" : formatClock(left)}</span>
              <span className="sr-only"> left</span>
            </Badge>
          </div>
          <CardTitle>
            <h2>{current.question}</h2>
          </CardTitle>
          {followUp && (
            <CardDescription>
              Asked by the AI from your first answer and the session.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={`${id}-answer`}>Your answer</FieldLabel>
            <Textarea
              ref={field}
              id={`${id}-answer`}
              rows={5}
              maxLength={MAX_ANSWER}
              readOnly={pending || expired}
              value={answer}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
              onChange={(event) => {
                setAnswer(event.target.value);
                setError(null);
              }}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <FieldDescription id={`${id}-hint`}>
              <span className="flex items-center gap-1">
                <ProhibitIcon aria-hidden="true" />
                Paste and drop are off. At 0:00 what you&rsquo;ve typed is sent.
              </span>
            </FieldDescription>
            <FieldError id={`${id}-error`}>{error}</FieldError>
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending || expired}>
            {pending
              ? followUp
                ? "Grading"
                : "Writing the follow-up"
              : followUp
                ? "Finish"
                : "Next"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
