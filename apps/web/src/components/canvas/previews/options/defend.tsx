"use client";

// Options for /defend that teach on the page: what is being defended, why the clock and the paste block, what the grade
// means, and what to do next. Three layouts: A a guided checklist, B the task with a side panel that explains as you go,
// C one focused task at a time. Every option takes a `stage` so the canvas can show any step; the buttons move it on.
// Synthetic data only. The answer key never appears: the result shows the score and what was missing, as the route does.
// A runs the steps as a rail across the top, B keeps a side panel of whys, C shows one column and nothing else.

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "@phosphor-icons/react";
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
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
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

/** /defend in the app shell. */
function DefendPage({
  description,
  actions,
  children,
}: {
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppFrame path="/defend" crumb="Defend it">
      <Container>
        <AppPageHeader title="Defend it" description={description} actions={actions} />
        {children}
      </Container>
    </AppFrame>
  );
}

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

function TimerBadge({ left }: { left: number }) {
  return (
    <Badge variant={left <= 30 ? "warning" : "outline"}>
      <TimerIcon aria-hidden="true" />
      <span className="tabular-nums">{clock(left)}</span>
      <span className="sr-only"> left</span>
    </Badge>
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
// Option A: a guided checklist. The four steps run as a rail across the top, each with one line on why it exists; the
// task under it gets the full width. Done steps tick, so the learner always knows where they are and what's left.

const STEPS: { stage: DefendStage; title: string; why: string }[] = [
  {
    stage: "start",
    title: "We pick one decision",
    why: `At random, from the ${DEFENDABLE} cards you've explained (scored 2 in a review). Random, so you can't prepare one.`,
  },
  {
    stage: "answer",
    title: "Explain it in 3 minutes",
    why: "In your own words, paste off. At 0:00 whatever you typed is sent.",
  },
  {
    stage: "follow-up",
    title: "Answer one follow-up in 2 minutes",
    why: "The AI reads your answer and the session, then asks about the part you skipped.",
  },
  {
    stage: "result",
    title: "Get one grade",
    why: "0, 1 or 2 for the whole defense. Only a 2 counts as defended.",
  },
];

function Checklist({ stage }: { stage: DefendStage }) {
  const current = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className="grid grid-cols-4 gap-3">
      {STEPS.map((step, i) => {
        const done = i < current;
        return (
          <li key={step.stage} className="flex">
            <Item variant="outline" data-selected={i === current ? true : undefined}>
              <ItemMedia variant="icon">
                {done ? <CheckCircleIcon aria-hidden="true" /> : <CircleIcon aria-hidden="true" />}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  <span className="sr-only">
                    {done ? "Done: " : i === current ? "Now: " : "Next: "}
                  </span>
                  {i + 1}. {step.title}
                </ItemTitle>
                <ItemDescription>{step.why}</ItemDescription>
              </ItemContent>
            </Item>
          </li>
        );
      })}
    </ol>
  );
}

function OptionATimed({
  stage,
  live,
  onNext,
}: {
  stage: DefendStage;
  live: boolean;
  onNext: () => void;
}) {
  const left = useCountdown(secondsFor(stage), live);
  const followUp = stage === "follow-up";
  return (
    <Card size="lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{followUp ? "Step 3 of 4" : "Step 2 of 4"}</Badge>
          <TimerBadge left={left} />
        </div>
        <CardTitle>
          <h2>{followUp ? FOLLOW_UP : QUESTION}</h2>
        </CardTitle>
        {followUp && (
          <CardDescription>
            Asked by the AI from your first answer and the session. It has 2 minutes of its own.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <DefendAnswer
          id={`opt-a-${stage}`}
          label="Your answer"
          hint="Say what you'd say in an interview: the choice, the reason, what breaks without it."
          disabled={left === 0}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={onNext}>
          {followUp ? "Send for grading" : "Send and get the follow-up"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function DefendOptionA({ stage: initial = "start" }: { stage?: DefendStage }) {
  const { stage, live, go } = useStage(initial);
  if (stage === "empty")
    return (
      <DefendPage description="Optional practice: explain one decision you got right, against the clock, like an interview.">
        <NothingToDefend />
      </DefendPage>
    );
  return (
    <DefendPage description="Optional practice: explain one decision you got right, against the clock, like an interview.">
      <div className="flex flex-col gap-6">
        <section aria-label="How Defend it works" className="flex flex-col gap-3">
          <h2 className="type-label text-text-2">How it works</h2>
          <Checklist stage={stage} />
          <p className="type-body-sm text-text-2">
            A defense never moves a card&rsquo;s review days (1, 4, 11). It only adds a
            &ldquo;defended&rdquo; mark.
          </p>
        </section>
        <div className="flex max-w-3xl flex-col gap-6">
          {stage === "start" && (
            <Card size="lg">
              <CardHeader>
                <CardTitle>
                  <h2 className="flex items-center gap-2">
                    <ShieldCheckIcon aria-hidden="true" />
                    Ready when you are
                  </h2>
                </CardTitle>
                <CardDescription>
                  The clock starts the moment the question appears. You won&rsquo;t see which
                  decision until then.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>Picks from</DataListLabel>
                    <DataListValue>{DEFENDABLE} decisions you explained right</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Takes</DataListLabel>
                    <DataListValue>
                      Up to 5 minutes: 3 for the answer, 2 for the follow-up
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
              <CardFooter>
                <Button onClick={() => go("answer")}>Start the timer</Button>
              </CardFooter>
            </Card>
          )}
          {(stage === "answer" || stage === "follow-up") && (
            <>
              <DecisionLine />
              <OptionATimed key={stage} stage={stage} live={live} onNext={() => go(NEXT[stage])} />
            </>
          )}
          {stage === "result" && (
            <Card size="lg">
              <CardHeader>
                <CardTitle>
                  <h2>Defended</h2>
                </CardTitle>
                <CardDescription>
                  All four steps done. This defense is saved as &ldquo;defended (timed,
                  follow-up)&rdquo;. Not &ldquo;verified&rdquo;: help off screen is still possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>Decision</DataListLabel>
                    <DataListValue>{DECISION}</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Score</DataListLabel>
                    <DataListValue>
                      <ScoreBadge score={2} />
                    </DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>What was missing</DataListLabel>
                    <DataListValue>{MISSING}</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>A 1 or a 0 would mean</DataListLabel>
                    <DataListValue>
                      Not defended this time. The card stays in the pick; start another whenever you
                      like.
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
              <CardFooter>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => go("start")}>Defend another</Button>
                  <Button variant="secondary">Back to dashboard</Button>
                </div>
              </CardFooter>
            </Card>
          )}
          <IdeaNote>
            The steps stay on screen the whole time, each with its reason, so the learner always
            knows what comes next and why.
          </IdeaNote>
        </div>
      </div>
    </DefendPage>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Option B: split, explain as you go. The task stays on the left; the right panel answers the question this step raises
// ("why can't I paste?", "where does the follow-up come from?", "what does a 2 mean?"), with the longer why folded away.

type Why = { title: string; short: string; more: string };

const WHY: Record<Exclude<DefendStage, "empty">, Why[]> = {
  start: [
    {
      title: "What gets defended",
      short: "One decision card you scored 2 on in a review.",
      more: "A decision card is one choice from a session your agent ran: what was decided and why. Scoring 2 (Explained) once makes it defendable. Owned is later: a card you explained on day 1, 4 and 11.",
    },
    {
      title: "Why it's random",
      short: "So you can't rehearse one answer.",
      more: "An interviewer picks the question, not you. Random keeps it close to that.",
    },
    {
      title: "What it doesn't touch",
      short: "Your review schedule.",
      more: "Reviews still come on days 1, 4 and 11. A defense adds a mark; it never moves a card.",
    },
  ],
  answer: [
    {
      title: "Why paste is off",
      short: "You're explaining it, not quoting it.",
      more: "Blocking paste raises the bar; it doesn't prove anything. Help off screen is still possible, so the result never says verified.",
    },
    {
      title: "What happens at 0:00",
      short: "Whatever you typed is sent.",
      more: "The server keeps the clock, with 5 seconds of grace for the network. An empty box ends this defense; start again for another decision.",
    },
    {
      title: "What a good answer has",
      short: "The choice, the reason, and what breaks without it.",
      more: "You can't see the stored answer, and you won't after. The grade says what was missing instead.",
    },
  ],
  "follow-up": [
    {
      title: "Where this question came from",
      short: "The AI read your answer and the session.",
      more: "It looks for the part you skipped or got vague on, like an interviewer's second question. There's only one.",
    },
    {
      title: "Why a new clock",
      short: "2 minutes, started when the question was stored.",
      more: "Same rules as before: paste off, sent at 0:00, graded with your first answer.",
    },
  ],
  result: [
    {
      title: "What the score means",
      short: "One grade for both answers together.",
      more: "2 Explained: defended. 1 Partly or 0 Missed: not this time. Either way your review days stay where they were.",
    },
    {
      title: "What it's called",
      short: "Defended (timed, follow-up).",
      more: 'Never "verified": paste was off, but help off screen is still possible.',
    },
  ],
};

function WhyPanel({ stage }: { stage: Exclude<DefendStage, "empty"> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>What&rsquo;s happening</h2>
        </CardTitle>
        <CardDescription>Changes with each step.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {WHY[stage].map((why) => (
            <Collapsible key={why.title}>
              <div className="flex flex-col gap-1">
                <h3 className="type-label">{why.title}</h3>
                <p className="type-body-sm text-text-2">{why.short}</p>
                <CollapsibleRow size="sm">Why</CollapsibleRow>
              </div>
              <CollapsibleContent>
                <p className="pt-2 type-body-sm text-text-2">{why.more}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OptionBTimed({
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
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <h2>{followUp ? FOLLOW_UP : QUESTION}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Progress value={left} max={total}>
            <ProgressLabel>{followUp ? "Follow-up time" : "Answer time"}</ProgressLabel>
            <ProgressValue>{() => clock(left)}</ProgressValue>
          </Progress>
          <DefendAnswer
            id={`opt-b-${stage}`}
            label="Your answer"
            hint="Paste and drop are off. Try pasting here to see."
            disabled={left === 0}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext}>{followUp ? "Finish" : "Next"}</Button>
      </CardFooter>
    </Card>
  );
}

export function DefendOptionB({ stage: initial = "start" }: { stage?: DefendStage }) {
  const { stage, live, go } = useStage(initial);
  const description =
    "Optional practice: explain one decision you got right, against the clock, like an interview.";
  if (stage === "empty")
    return (
      <DefendPage description={description}>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <NothingToDefend />
          </div>
          <WhyPanel stage="start" />
        </div>
      </DefendPage>
    );
  return (
    <DefendPage
      description={description}
      actions={
        stage === "answer" || stage === "follow-up" ? (
          <Badge variant="outline">{stage === "answer" ? "Question 1 of 2" : "Follow-up"}</Badge>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          {stage === "start" && (
            <Card size="lg">
              <CardHeader>
                <CardTitle>
                  <h2 className="flex items-center gap-2">
                    <ShieldCheckIcon aria-hidden="true" />
                    Defend a decision
                  </h2>
                </CardTitle>
                <CardDescription>
                  3 minutes to explain, then one follow-up with 2 more. Read the panel first if this
                  is your first time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>From</DataListLabel>
                    <DataListValue>{DEFENDABLE} decisions you explained right</DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
              <CardFooter>
                <Button onClick={() => go("answer")}>Start the timer</Button>
              </CardFooter>
            </Card>
          )}
          {(stage === "answer" || stage === "follow-up") && (
            <>
              <DecisionLine />
              <OptionBTimed key={stage} stage={stage} live={live} onNext={() => go(NEXT[stage])} />
            </>
          )}
          {stage === "result" && (
            <Card size="lg">
              <CardHeader>
                <CardTitle>
                  <h2>Defended</h2>
                </CardTitle>
                <CardDescription>Defended (timed, follow-up).</CardDescription>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>Score</DataListLabel>
                    <DataListValue>
                      <ScoreBadge score={2} />
                    </DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>What was missing</DataListLabel>
                    <DataListValue>{MISSING}</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Your reviews</DataListLabel>
                    <DataListValue>
                      Unchanged. The next one for this card is still on its day.
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
              <CardFooter>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => go("start")}>Defend another</Button>
                  <Button variant="secondary">Back to dashboard</Button>
                </div>
              </CardFooter>
            </Card>
          )}
          <IdeaNote>
            The task stays on the left; the panel answers the question each step raises, with the
            longer why folded away.
          </IdeaNote>
        </div>
        <WhyPanel stage={stage} />
      </div>
    </DefendPage>
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
