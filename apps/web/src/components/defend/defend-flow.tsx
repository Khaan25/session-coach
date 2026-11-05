"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { clockOffset, formatClock, secondsLeft } from "@/lib/defend/clock";
import { useFocusWhenReplaced } from "@/lib/ui/use-focus-when-replaced";

// MAX_ANSWER in lib/review/grade.ts; not imported, so zod stays out of the client bundle. The routes check it again.
const MAX_ANSWER = 4000;
const TIME_UP = {
  empty: "Nothing was typed before the clock ran out, so this one ends here.",
  late: "Time ran out before your answer arrived, so this one ends here.",
  failed: "Your answer couldn't be sent before the clock ran out, so this one ends here.",
} as const;
const PASTE_OFF = "Paste is off in Defend it. Type it in your own words.";
/** Shown once, before the clock starts; while it runs each control carries one line instead. */
const RULES = [
  {
    title: "One decision you've explained",
    body: "A card you scored 2 on in a review, picked at random.",
  },
  { title: "3 minutes, then 2 more", body: "One answer, then one follow-up the AI asks from it." },
  { title: "Your own words", body: "Paste is off. At 0:00 what you typed is sent." },
];

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
      /** The whole window in seconds, by the server's clock, so the bar can show how much is used. */
      total: number;
    }
  | { kind: "graded"; result: Graded }
  /** empty: nothing typed at 0:00; late: the answer reached the server after the deadline; failed: the send at 0:00 failed. */
  | { kind: "time-up"; reason: "empty" | "late" | "failed" };

/** Thrown for a 409 the learner can only answer by starting again: the time ran out, or the defense moved on. */
class Conflict extends Error {
  /** Set when start found a defense still running, e.g. from before a reload. */
  running = false;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!response) throw new Error("Check your connection and try again.");
  const data = await response.json().catch(() => null);
  if (response.status === 409) {
    const conflict = new Conflict(data?.error ?? "Start again.");
    conflict.running = typeof data?.defenseId === "string";
    throw conflict;
  }
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
          total: secondsLeft(started.answerDueAt, 0, new Date(started.serverNow).getTime()),
        });
      })
      .catch((reason: unknown) =>
        setError(
          // There's no route to resume it, so say how long until a new one can start.
          reason instanceof Conflict && reason.running
            ? "A defense from earlier is still running, maybe from before a reload. It ends within about 3 minutes; start again then."
            : reason instanceof Error
              ? reason.message
              : "Try again.",
        ),
      )
      .finally(() => setPending(false));
  }

  function send(current: NonNullable<typeof timed>, text: string) {
    setPending(true);
    setError(null);
    const done = () => setPending(false);
    const failed = (reason: unknown) => {
      if (reason instanceof Conflict) setStep({ kind: "time-up", reason: "late" });
      // Past 0:00 the box is locked, so a failed send can't be retried here: end it with a way to start again.
      else if (secondsLeft(current.dueAt, current.offset, Date.now()) === 0)
        setStep({ kind: "time-up", reason: "failed" });
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
            total: secondsLeft(next.followUpDueAt, 0, new Date(next.serverNow).getTime()),
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
    else setStep({ kind: "time-up", reason: "empty" });
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
      <>
        <div className="flex flex-col gap-2">
          <h1 className="type-heading">Defend it</h1>
          <p className="type-body text-text-2">
            Optional practice, like an interview: explain why a decision in your code is right,
            against the clock.
          </p>
        </div>
        <ol className="flex flex-col gap-4">
          {RULES.map((rule, i) => (
            <li key={rule.title} className="flex gap-3">
              <span className="type-label text-text-2 tabular-nums">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="type-label">{rule.title}</span>
                <span className="type-body-sm text-text-2">{rule.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <div>
            <Button onClick={start} disabled={pending}>
              {pending ? "Picking a decision" : `Start: pick one of ${defendable}`}
            </Button>
          </div>
          <p className="type-body-sm text-text-2">
            The clock starts when the question appears. Your review days don&rsquo;t change.
          </p>
          {error && <FieldError>{error}</FieldError>}
        </div>
      </>
    );

  if (step.kind === "graded" || step.kind === "time-up") {
    const result = step.kind === "graded" ? step.result : null;
    const defended = result?.score === 2;
    const again = (
      <Button
        variant={result && !defended ? "secondary" : "default"}
        onClick={() => {
          setStep({ kind: "ready" });
          start();
        }}
        disabled={pending}
      >
        Defend another
      </Button>
    );
    return (
      <>
        <div className="flex flex-col gap-2">
          {result && <ScoreBadge score={result.score} />}
          <h1 ref={resultHeading} tabIndex={-1} className="type-heading">
            {!result ? "Time's up" : defended ? "Defended" : "Not defended this time"}
          </h1>
          <p className="type-body text-text-2">
            {!result
              ? `${TIME_UP[step.kind === "time-up" ? step.reason : "empty"]} Start again for another decision.`
              : defended
                ? "Defended (timed, follow-up)."
                : "Explain it again in your next review, then defend it again."}
          </p>
        </div>
        {result && (
          <DataList>
            <DataListItem>
              <DataListLabel>What was missing</DataListLabel>
              <DataListValue>{result.missing || "Nothing"}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Why not &ldquo;verified&rdquo;</DataListLabel>
              <DataListValue>
                Paste was off, but help off screen is still possible. Defended is the honest word.
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Your reviews</DataListLabel>
              <DataListValue>
                Unchanged: a defense never moves a card&rsquo;s schedule.
              </DataListValue>
            </DataListItem>
          </DataList>
        )}
        <div className="flex flex-col gap-3">
          <h2 className="type-label text-text-2">What to do next</h2>
          {/* Below a 2 the review is the way back to a defense, so it leads; otherwise another defense does. */}
          <div className="flex flex-wrap gap-3">
            {result && !defended ? (
              <>
                <Link href="/review" className={buttonVariants()}>
                  See today&rsquo;s reviews
                </Link>
                {again}
              </>
            ) : (
              <>
                {again}
                <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
                  Back to dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  const current = step;
  const followUp = current.kind === "follow-up";
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <h1 className="sr-only">Defend it</h1>
      <Progress
        value={left ?? current.total}
        max={current.total}
        data-status={left !== null && left <= 30 ? "warn" : undefined}
      >
        <ProgressLabel>{followUp ? "2 of 2 · follow-up" : "1 of 2 · your answer"}</ProgressLabel>
        <ProgressValue>{() => `${left === null ? "-:--" : formatClock(left)} left`}</ProgressValue>
      </Progress>
      <div className="flex flex-col gap-2">
        <h2 className="type-heading-sm">{current.question}</h2>
        {followUp && (
          <p className="type-body-sm text-text-2">
            The AI asked this after reading your first answer. It&rsquo;s the only one.
          </p>
        )}
      </div>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`${id}-answer`}>Your answer</FieldLabel>
        <Textarea
          ref={field}
          id={`${id}-answer`}
          rows={6}
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
          {followUp
            ? "Graded together with your first answer."
            : "No need to be long. The reason and what breaks without it."}
        </FieldDescription>
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || expired}>
          {pending ? (
            followUp ? (
              "Grading"
            ) : (
              "Writing the follow-up"
            )
          ) : (
            <>
              {followUp ? "Finish" : "Send"}
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </>
          )}
        </Button>
        <span className="type-body-sm text-text-2">
          {followUp ? "Then you get one grade." : "Then the follow-up appears."}
        </span>
      </div>
    </form>
  );
}
