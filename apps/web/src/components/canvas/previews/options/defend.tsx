"use client";

// Options for /defend that teach on the page: what is being defended, why the clock and the paste block, what the grade
// means, and what to do next. Three layouts: A a guided checklist, B the task with a side panel that explains as you go,
// C one focused task at a time. Every option takes a `stage` so the canvas can show any step; the buttons move it on.
// Synthetic data only. The answer key never appears: the result shows the score and what was missing, as the route does.
// A runs the steps as a rail across the top, B keeps a side panel of whys, C shows one column and nothing else.

import { ArrowRightIcon, ProhibitIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { ScoreBadge } from "@/components/app/score-badge";
import { Button } from "@/components/ui/button";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { IdeaNote } from "../parts";

export type DefendStage = "empty" | "start" | "answer" | "follow-up" | "result";

const ANSWER_SECONDS = 180;
const FOLLOW_UP_SECONDS = 120;
const DEFENDABLE = 9;
const SESSION = FRAME_SESSIONS[0]!;
const DECISION = "Rate limit uploads per CLI token, not per IP";
const QUESTION =
  "Why key the upload limit on the token? What breaks if you key it on the IP instead?";
const FOLLOW_UP =
  "You said a shared office IP would block everyone. The session also mentions retries from the CLI. How does the token key stop one learner's retries from hurting another?";
const MISSING = "Nothing. You tied the retries to the token and said why an IP is shared.";
const PASTE_OFF = "Paste is off in Defend it. Type it in your own words.";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const secondsFor = (stage: DefendStage) =>
  stage === "follow-up" ? FOLLOW_UP_SECONDS : ANSWER_SECONDS;

/** Counts down from `seconds` once `running`; the canvas starts it only after someone presses a button. */
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

/** The stage plus whether the learner got there by pressing a button (then the clock runs). */
function useStage(initial: DefendStage) {
  const [stage, setStage] = useState(initial);
  const [live, setLive] = useState(false);
  const go = (next: DefendStage) => {
    setStage(next);
    setLive(true);
  };
  return { stage, live, go };
}

const NEXT: Record<DefendStage, DefendStage> = {
  empty: "start",
  start: "answer",
  answer: "follow-up",
  "follow-up": "result",
  result: "start",
};

/** A textarea that refuses paste and drop, and says why the moment someone tries. */
function DefendAnswer({
  id,
  label,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
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
        rows={6}
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
            {PASTE_OFF}
          </span>
        ) : (
          hint
        )}
      </FieldDescription>
    </Field>
  );
}

/** The decision being defended, with where it came from, so "decision card" has a concrete example on screen. */
function DecisionLine() {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-label-sm text-text-2">
        Decision card from &ldquo;{SESSION.title}&rdquo; in {SESSION.repo}
      </span>
      <span className="type-heading">{DECISION}</span>
    </div>
  );
}

function NothingToDefend() {
  return (
    <EmptyState
      icon={ShieldCheckIcon}
      title="Nothing to defend yet"
      description="Defend it picks from decisions you've explained: a card you scored 2 on in a review. Explain one card right first, then come back."
      action={<Button variant="secondary">Open the review queue</Button>}
    />
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Option C: one focused task. A narrow column, nothing else on screen. Before the clock, three short rules the learner
// confirms by starting; during it, one line under each control; after it, the next step chosen for them.

const RULES = [
  {
    title: "One decision you've explained",
    body: "A card you scored 2 on in a review, picked at random.",
  },
  { title: "3 minutes, then 2 more", body: "One answer, then one follow-up the AI asks from it." },
  { title: "Your own words", body: "Paste is off. At 0:00 what you typed is sent." },
];

function OptionCTimed({
  stage,
  live,
  onNext,
}: {
  stage: DefendStage;
  live: boolean;
  onNext: () => void;
}) {
  const total = secondsFor(stage);
  const left = useCountdown(total, live);
  const followUp = stage === "follow-up";
  return (
    <div className="flex flex-col gap-6">
      <Progress value={left} max={total}>
        <ProgressLabel>{followUp ? "2 of 2 · follow-up" : "1 of 2 · your answer"}</ProgressLabel>
        <ProgressValue>{() => `${clock(left)} left`}</ProgressValue>
      </Progress>
      <DecisionLine />
      <div className="flex flex-col gap-2">
        <h2 className="type-heading-sm">{followUp ? FOLLOW_UP : QUESTION}</h2>
        {followUp && (
          <p className="type-body-sm text-text-2">
            The AI asked this after reading your first answer. It&rsquo;s the only one.
          </p>
        )}
      </div>
      <DefendAnswer
        id={`opt-c-${stage}`}
        label="Your answer"
        hint={
          followUp
            ? "Graded together with your first answer."
            : "No need to be long. The reason and what breaks without it."
        }
        disabled={left === 0}
      />
      <div className="flex items-center gap-3">
        <Button onClick={onNext}>
          {followUp ? "Finish" : "Send"}
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
        <span className="type-body-sm text-text-2">
          {followUp ? "Then you get one grade." : "Then the follow-up appears."}
        </span>
      </div>
    </div>
  );
}

export function DefendOptionC({ stage: initial = "start" }: { stage?: DefendStage }) {
  const { stage, live, go } = useStage(initial);
  return (
    <AppFrame path="/defend" crumb="Defend it">
      <Container>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
          {stage === "empty" && <NothingToDefend />}
          {stage === "start" && (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="type-heading">Defend it</h1>
                <p className="type-body text-text-2">
                  Optional practice, like an interview: explain why a decision in your code is
                  right, against the clock.
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
                  <Button onClick={() => go("answer")}>Start: pick one of {DEFENDABLE}</Button>
                </div>
                <p className="type-body-sm text-text-2">
                  The clock starts when the question appears. Your review days don&rsquo;t change.
                </p>
              </div>
            </>
          )}
          {(stage === "answer" || stage === "follow-up") && (
            <OptionCTimed key={stage} stage={stage} live={live} onNext={() => go(NEXT[stage])} />
          )}
          {stage === "result" && (
            <>
              <div className="flex flex-col gap-2">
                <ScoreBadge score={2} />
                <h1 className="type-heading">Defended</h1>
                <p className="type-body text-text-2">
                  &ldquo;{DECISION}&rdquo; is saved as defended (timed, follow-up).
                </p>
              </div>
              <DataList>
                <DataListItem>
                  <DataListLabel>What was missing</DataListLabel>
                  <DataListValue>{MISSING}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Why not &ldquo;verified&rdquo;</DataListLabel>
                  <DataListValue>
                    Paste was off, but help off screen is still possible. Defended is the honest
                    word.
                  </DataListValue>
                </DataListItem>
              </DataList>
              <div className="flex flex-col gap-3">
                <h2 className="type-label text-text-2">What to do next</h2>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => go("start")}>Defend another</Button>
                  <Button variant="secondary">See today&rsquo;s reviews</Button>
                </div>
              </div>
            </>
          )}
          <IdeaNote>
            One task on screen at a time. Each control carries one line on what it does; the rules
            come once, before the clock, when there&rsquo;s time to read them.
          </IdeaNote>
        </div>
      </Container>
    </AppFrame>
  );
}
