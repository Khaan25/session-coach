"use client";

// Defend it: a timed explanation with paste and drop blocked, one AI follow-up, then a grade.

import { ProhibitIcon, ShieldCheckIcon, TimerIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame } from "./frames";
import { IdeaNote } from "./parts";

const DESCRIPTION = "Explain one decision you own against the clock, like an interview.";

/** /defend, a proposed page: the app shell, the page header, then the step. */
function DefendPage({
  actions,
  children,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppFrame path="/defend" crumb="Defend it">
      <Container>
        <AppPageHeader title="Defend it" description={DESCRIPTION} actions={actions} />
        {children}
      </Container>
    </AppFrame>
  );
}

const DECISION = "Rate limit uploads per CLI token, not per IP";
const QUESTION =
  "Why key the upload limit on the token? What breaks if you key it on the IP instead?";
const FOLLOW_UP =
  "You said a shared office IP would block everyone. The session also mentions retries from the CLI. How does the token key stop one learner's retries from hurting another?";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Counts down from `seconds` while mounted. Paused on the canvas until someone presses Start. */
function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds);
  const done = left === 0;
  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running, done]);
  return left;
}

/** A field that refuses paste and drop, and says why the moment someone tries. */
function DefendField({ id, label, disabled }: { id: string; label: string; disabled?: boolean }) {
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const refuse = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setBlocked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBlocked(false), 4000);
  };
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={4}
        disabled={disabled}
        onPaste={refuse}
        onDrop={refuse}
        autoComplete="off"
        spellCheck={false}
      />
      <FieldDescription aria-live="polite">
        {blocked ? (
          <span className="flex items-center gap-1 text-warning-text">
            <ProhibitIcon aria-hidden="true" />
            Paste is off in Defend it. Type it in your own words.
          </span>
        ) : (
          "Paste and drop are off. Try pasting here to see."
        )}
      </FieldDescription>
    </Field>
  );
}

function TimerBadge({ left }: { left: number }) {
  return (
    <Badge variant={left <= 30 ? "warning" : "outline"}>
      <TimerIcon aria-hidden="true" />
      <span className="tabular-nums">{clock(left)}</span>
      <span className="sr-only"> left</span>
    </Badge>
  );
}

export function DefendStartPreview() {
  return (
    <DefendPage>
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <ShieldCheckIcon aria-hidden="true" />
              Defend a decision
            </h2>
          </CardTitle>
          <CardDescription>
            We pick one decision you own at random. You get 3 minutes, no paste, and one follow-up
            question, like an interview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>From</DataListLabel>
              <DataListValue>17 owned decisions in 2 repos</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Counts as</DataListLabel>
              <DataListValue>
                Defended (timed, follow-up). Never &ldquo;verified&rdquo;.
              </DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <CardFooter>
          <Button>Start the timer</Button>
        </CardFooter>
      </Card>
    </DefendPage>
  );
}

/** Interactive: press Start to run the clock, try pasting into the box. */
export function DefendAnswerPreview({ followUp }: { followUp?: boolean }) {
  const [running, setRunning] = useState(false);
  const left = useCountdown(followUp ? 120 : 180, running);
  return (
    <DefendPage
      actions={
        <>
          <Badge variant="outline">{followUp ? "Follow-up" : "Question 1 of 2"}</Badge>
          <TimerBadge left={left} />
        </>
      }
    >
      <span className="type-heading">{DECISION}</span>
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>{followUp ? FOLLOW_UP : QUESTION}</h2>
          </CardTitle>
          {followUp && (
            <CardDescription>
              Asked by the AI from your first answer and the session evidence.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <DefendField
            id={followUp ? "canvas-defend-follow" : "canvas-defend-answer"}
            label="Your answer"
            disabled={left === 0}
          />
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            {!running && left > 0 ? (
              <Button variant="secondary" onClick={() => setRunning(true)}>
                Start the clock
              </Button>
            ) : (
              <Button>{followUp ? "Finish" : "Next"}</Button>
            )}
          </div>
        </CardFooter>
      </Card>
      <IdeaNote>
        The question and follow-up come from the server; the grade is computed there too, from the
        stored evidence. Blocking paste only raises the bar: help off screen is still possible, so
        we never say &ldquo;verified&rdquo;.
      </IdeaNote>
    </DefendPage>
  );
}

export function DefendResultPreview({ state }: { state: "passed" | "time-up" | "none-owned" }) {
  if (state === "none-owned")
    return (
      <DefendPage>
        <EmptyState
          icon={ShieldCheckIcon}
          title="Nothing to defend yet"
          description="Defend it picks from decisions you own: explained right on day 1, 3 and 7. Your first one is due in 5 days."
          action={<Button variant="secondary">Go to today&rsquo;s review</Button>}
        />
      </DefendPage>
    );
  return (
    <DefendPage>
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>{state === "passed" ? "Defended" : "Time's up"}</h2>
          </CardTitle>
          <CardDescription>
            {state === "passed"
              ? "Timed, with a follow-up. Shown on your ownership report if you share it."
              : "We kept what you typed and graded it. You can defend this one again tomorrow."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>Score</DataListLabel>
              <DataListValue>
                <ScoreBadge score={state === "passed" ? 2 : 1} />
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Time</DataListLabel>
              <DataListValue>
                {state === "passed" ? "2:14 of 3:00, follow-up 1:05" : "3:00 of 3:00"}
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>What the follow-up found</DataListLabel>
              <DataListValue>
                {state === "passed"
                  ? "You tied the retries to the token correctly."
                  : "The follow-up wasn't answered, so the retry part is missing."}
              </DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button>{state === "passed" ? "Defend another" : "Try another decision"}</Button>
            <Button variant="secondary">Back to dashboard</Button>
          </div>
        </CardFooter>
      </Card>
    </DefendPage>
  );
}
