"use client";

// Three ways the dashboard could teach a newcomer on the page itself: what a decision card is, why they answer before
// they see the why, what the review days mean, explained vs owned, and what to do next. Each option has a full state
// and a first-visit state. Synthetic data only; nothing here calls an API, and no card shows its why or answer key.

import {
  CaretRightIcon,
  CheckCircleIcon,
  CircleIcon,
  LockSimpleIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { SessionRow } from "@/components/app/session-row";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { IdeaNote, NOW, Terminal } from "../parts";

// ---------------------------------------------------------------------------------------------------------------------
// Synthetic data, shared by every option.

const ROWS = FRAME_SESSIONS.map((s, i) => ({
  ...s,
  branch: null,
  error: s.status === "failed" ? "The log was empty after redaction." : null,
  created_at: new Date(NOW.getTime() - (i * 9 + 2) * 3_600_000).toISOString(),
  cardCount: s.status === "ready" ? 4 : undefined,
}));

/** The review steps a card climbs. Reviews fall on days 1, 4 and 11; a pass on day 11 makes it owned. */
const STEPS = ["Day 1", "Day 4", "Day 11", "Owned"] as const;
type Step = (typeof STEPS)[number];

/** Today's due cards: the decision and the question only. The why is never on the page before an answer. */
const DUE: { id: string; decision: string; question: string; repo: string; step: Step }[] = [
  {
    id: "c1",
    decision: "Rate limit the upload route per token, not per IP",
    question: "Why is the limit keyed on the token rather than the IP?",
    repo: "session-coach",
    step: "Day 4",
  },
  {
    id: "c2",
    decision: "Return 429 with a Retry-After header",
    question: "Why does the route send Retry-After instead of only a 429?",
    repo: "session-coach",
    step: "Day 1",
  },
  {
    id: "c3",
    decision: "Skip unknown JSONL line types instead of throwing",
    question: "Why does the parser skip a line type it doesn't know?",
    repo: "rapporteur",
    step: "Day 1",
  },
];

/** Explained: answered right once. Owned: still right on day 11. No card can be owned yet this early in the run. */
const PROJECTS = [
  { repo: "session-coach", explained: 9, owned: 0, total: 14 },
  { repo: "rapporteur", explained: 2, owned: 0, total: 5 },
];
const TOTAL = PROJECTS.reduce(
  (sum, p) => ({
    explained: sum.explained + p.explained,
    owned: sum.owned + p.owned,
    total: sum.total + p.total,
  }),
  { explained: 0, owned: 0, total: 0 },
);

const DECISION_CARD =
  "A decision card is one choice your agent made in a session, with a quote from the log that proves it.";
const ANSWER_FIRST =
  "You explain it before you see the why. Pulling it from memory is what makes it stick; reading it first only feels like learning.";
const SCHEDULE =
  "Each answer scores 0 (missed), 1 (partly) or 2 (explained). A 2 brings the card back on day 1, then day 4, then day 11; below 2, it steps down one and comes back tomorrow. At most 5 cards a day.";
const OWNERSHIP =
  "Explained means you got it right once. Owned means you still could on day 11, without looking.";
const DEFEND =
  "Optional: Defend it picks a card you’ve explained and asks you to argue for it on a clock, with one follow-up.";

// ---------------------------------------------------------------------------------------------------------------------
// Small shared pieces.

/** The four steps in a row, the card's own step marked. Passed steps are done, later ones are outlined. */
function ScheduleLadder({ at }: { at?: Step }) {
  const current = at ? STEPS.indexOf(at) : -1;
  return (
    <ol aria-label="Review schedule" className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <Badge
            variant={i < current ? "success" : i === current ? "default" : "outline"}
            aria-current={i === current ? "step" : undefined}
          >
            {step}
          </Badge>
          {i < STEPS.length - 1 && <CaretRightIcon aria-hidden="true" className="text-text-3" />}
        </li>
      ))}
    </ol>
  );
}

/** Explained bars per project, with the overall line. */
function OwnershipBars() {
  return (
    <div className="flex flex-col gap-4">
      {PROJECTS.map((p) => (
        <Progress key={p.repo} value={Math.round((p.explained / p.total) * 100)}>
          <ProgressLabel>{p.repo}</ProgressLabel>
          <ProgressValue>
            {() => `Explained ${p.explained} · owned ${p.owned} of ${p.total}`}
          </ProgressValue>
        </Progress>
      ))}
    </div>
  );
}

/** The project filter as the real page draws it: links styled as small buttons. */
function ProjectLinks({ active = null }: { active?: string | null }) {
  return (
    <nav aria-label="Projects" className="flex flex-wrap gap-2">
      {[null, ...PROJECTS.map((p) => p.repo)].map((name) => (
        <Link
          key={name ?? ""}
          href={name ? `/dashboard?repo=${name}` : "/dashboard"}
          aria-current={name === active ? "page" : undefined}
          className={buttonVariants({
            variant: name === active ? "secondary" : "ghost",
            size: "sm",
          })}
        >
          {name ?? "All projects"}
        </Link>
      ))}
    </nav>
  );
}

function SessionRows({ repo = null }: { repo?: string | null }) {
  return (
    <ItemGroup>
      {ROWS.filter((s) => !repo || s.repo === repo).map((s) => (
        <SessionRow key={s.id} session={s} cardCount={s.cardCount} now={NOW} />
      ))}
    </ItemGroup>
  );
}

function SessionsCard({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sessions</h2>
        </CardTitle>
        <CardDescription>
          Each Claude Code session you send becomes up to 5 decision cards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProjectLinks />
      </CardContent>
      {children ?? <SessionRows />}
    </Card>
  );
}

const SETUP_COMMANDS = [
  "$ npx session-coach login",
  "Approved in the browser. Logged in.",
  "$ npx session-coach push --latest",
  "Sent. Making cards…",
];

// ---------------------------------------------------------------------------------------------------------------------
// Option A: a guided checklist. The page is the four things a learner does, in order, each with one line of why.

type ChecklistStep = {
  title: string;
  /** One or two lines: ItemDescription is a clamped paragraph, so anything block-level goes in `extra`. */
  body: string;
  extra?: React.ReactNode;
  state: "done" | "now" | "later";
  action?: React.ReactNode;
};

function Checklist({ steps }: { steps: ChecklistStep[] }) {
  return (
    <ItemGroup>
      {steps.map((step, i) => (
        // ItemGroup is a div with role="list", so the row takes the matching role.
        <Item
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="listitem"
          key={step.title}
          variant={step.state === "now" ? "outline" : "default"}
          aria-current={step.state === "now" ? "step" : undefined}
        >
          <ItemMedia variant="icon">
            {step.state === "done" ? (
              <CheckCircleIcon weight="fill" aria-label="Done" />
            ) : (
              <CircleIcon aria-label={step.state === "now" ? "Next" : "Later"} />
            )}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <span className={step.state === "later" ? "text-text-3" : undefined}>
                {i + 1}. {step.title}
              </span>
            </ItemTitle>
            <ItemDescription>{step.body}</ItemDescription>
            {step.extra}
          </ItemContent>
          {step.action && <ItemActions>{step.action}</ItemActions>}
        </Item>
      ))}
    </ItemGroup>
  );
}

export function DashboardHomeOptionA() {
  const steps: ChecklistStep[] = [
    {
      title: "Send a session",
      state: "done",
      body: `4 sessions sent, 19 cards made. ${DECISION_CARD}`,
    },
    {
      title: `Explain today’s ${DUE.length} cards`,
      state: "now",
      body: ANSWER_FIRST,
      extra: (
        <ul className="flex flex-col gap-1 pt-1 type-body-sm text-text-1">
          {DUE.map((card) => (
            <li key={card.id}>{card.question}</li>
          ))}
        </ul>
      ),
      action: (
        <Link href="/review" className={buttonVariants()}>
          Start review
        </Link>
      ),
    },
    {
      title: "Bring them back on days 1, 4 and 11",
      state: "later",
      body: SCHEDULE,
      extra: <ScheduleLadder />,
    },
    {
      title: "Own a decision",
      state: "later",
      body: OWNERSHIP,
      extra: <p className="type-body-sm text-text-3">{DEFEND}</p>,
    },
  ];
  return (
    <AppFrame path="/dashboard">
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Four steps turn your agent’s decisions into ones you can explain. You’re on step 2."
        />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Your next step</h2>
            </CardTitle>
            <CardDescription>Done steps stay ticked; the outlined one is today’s.</CardDescription>
          </CardHeader>
          <Checklist steps={steps} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>
                  Explained {TOTAL.explained} · owned {TOTAL.owned} of {TOTAL.total}
                </h2>
              </CardTitle>
              <CardDescription>{OWNERSHIP}</CardDescription>
            </CardHeader>
            <CardContent>
              <OwnershipBars />
            </CardContent>
          </Card>
          <SessionsCard />
        </div>
        <IdeaNote>
          Option A: the dashboard leads with a numbered checklist of the daily loop. Each step
          carries the one sentence that explains it, so the concepts arrive in the order the learner
          needs them.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

export function DashboardHomeOptionAEmpty() {
  const steps: ChecklistStep[] = [
    {
      title: "Send your first session",
      state: "now",
      body: "Log in once, then send the session you just finished. Secrets are redacted on your machine before anything leaves it.",
      extra: <Terminal lines={SETUP_COMMANDS} />,
      action: (
        <Link href="/setup" className={buttonVariants()}>
          Open setup
        </Link>
      ),
    },
    {
      title: "Explain your first cards",
      state: "later",
      body: DECISION_CARD,
      extra: <p className="type-body-sm text-text-2">{ANSWER_FIRST}</p>,
    },
    {
      title: "Bring them back on days 1, 4 and 11",
      state: "later",
      body: SCHEDULE,
      extra: <ScheduleLadder />,
    },
    { title: "Own a decision", state: "later", body: OWNERSHIP },
  ];
  return (
    <AppFrame path="/dashboard" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Four steps turn your agent’s decisions into ones you can explain. Start with step 1."
        />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Your next step</h2>
            </CardTitle>
            <CardDescription>Takes about two minutes. The rest unlock as you go.</CardDescription>
          </CardHeader>
          <Checklist steps={steps} />
        </Card>
        <IdeaNote>
          Option A, first visit: the same checklist with step 1 open and the commands inline, so the
          empty dashboard is the setup guide.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Option B: split, explain as you go. Content on the left; each block has a "What's this?" that opens in place, and a
// right rail takes one card apart so the learner sees what a decision card holds before they open one.

function WhatsThis({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleRow size="sm">{label}</CollapsibleRow>
      <CollapsibleContent>
        <p className="px-2 pt-2 type-body-sm text-text-2">{children}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** One card taken apart: each field with a line on what it is. The why stays locked, as it is before an answer. */
function CardAnatomy() {
  const card = DUE[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Inside a decision card</h2>
        </CardTitle>
        <CardDescription>{DECISION_CARD}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListItem>
            <DataListLabel>Decision</DataListLabel>
            <DataListValue>
              <span className="flex flex-col gap-1">
                {card.decision}
                <span className="type-body-sm text-text-3">What the agent chose.</span>
              </span>
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Question</DataListLabel>
            <DataListValue>
              <span className="flex flex-col gap-1">
                {card.question}
                <span className="type-body-sm text-text-3">What you answer, in your words.</span>
              </span>
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Why</DataListLabel>
            <DataListValue>
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-text-3">
                  <LockSimpleIcon aria-hidden="true" />
                  Shows after you answer.
                </span>
                <span className="type-body-sm text-text-3">{ANSWER_FIRST}</span>
              </span>
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Next review</DataListLabel>
            <DataListValue>
              <span className="flex flex-col gap-2">
                <ScheduleLadder at={card.step} />
                <span className="type-body-sm text-text-3">{SCHEDULE}</span>
              </span>
            </DataListValue>
          </DataListItem>
        </DataList>
      </CardContent>
    </Card>
  );
}

export function DashboardHomeOptionB() {
  const [repo, setRepo] = useState<string | null>(null);
  const due = DUE.filter((card) => !repo || card.repo === repo);
  return (
    <AppFrame path="/dashboard">
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Your agent’s decisions, project by project. Open any “What’s this?” to learn the part next to it."
        />
        <nav aria-label="Projects" className="flex flex-wrap gap-2">
          {[null, ...PROJECTS.map((p) => p.repo)].map((name) => (
            <Button
              key={name ?? ""}
              size="sm"
              variant={name === repo ? "secondary" : "ghost"}
              aria-pressed={name === repo}
              onClick={() => setRepo(name)}
            >
              {name ?? "All projects"}
            </Button>
          ))}
        </nav>
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>
                    {due.length} {due.length === 1 ? "card is" : "cards are"} due today
                  </h2>
                </CardTitle>
                <CardAction>
                  <Link href="/review" className={buttonVariants()}>
                    Start review
                  </Link>
                </CardAction>
              </CardHeader>
              <ItemGroup>
                {due.map((card) => (
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
                  <Item key={card.id} role="listitem">
                    <ItemContent>
                      <ItemTitle>{card.decision}</ItemTitle>
                      <ItemDescription>{card.question}</ItemDescription>
                    </ItemContent>
                    <Badge variant="outline">{card.step}</Badge>
                  </Item>
                ))}
              </ItemGroup>
              <CardFooter>
                <WhatsThis label="Why can’t I see the answers?">{ANSWER_FIRST}</WhatsThis>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>
                    Explained {TOTAL.explained} · owned {TOTAL.owned} of {TOTAL.total}
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OwnershipBars />
              </CardContent>
              <CardFooter>
                <WhatsThis label="Explained or owned?">
                  {OWNERSHIP} Owned stays at 0 until your first card passes its day 11 review.
                </WhatsThis>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Sessions</h2>
                </CardTitle>
              </CardHeader>
              <SessionRows repo={repo} />
              <CardFooter>
                <WhatsThis label="Where do sessions come from?">
                  The CLI sends a finished Claude Code session. The server keeps up to 5 decisions
                  it can back with a quote from the log, and drops the rest.
                </WhatsThis>
              </CardFooter>
            </Card>
          </div>
          <CardAnatomy />
        </div>
        <IdeaNote>
          Option B: every block carries its own closed “What’s this?”, so the explanation sits next
          to the thing it explains and costs nothing once learned. The rail takes one due card
          apart. The filter is live here; it narrows due cards and sessions together.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

export function DashboardHomeOptionBEmpty() {
  return (
    <AppFrame path="/dashboard" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Nothing here yet. Each block below says what will land in it."
        />
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <EmptyState
              icon={TerminalWindowIcon}
              title="Send your first session"
              description="Log in with the CLI, then send the session you just finished. It shows up here within a minute."
              action={
                <Link href="/setup" className={buttonVariants()}>
                  Open setup
                </Link>
              }
            />
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Due today</h2>
                </CardTitle>
                <CardDescription>
                  Cards to explain land here, at most 5 a day. {ANSWER_FIRST}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleLadder />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Explained 0 · owned 0</h2>
                </CardTitle>
                <CardDescription>
                  One bar per project, once you have cards. {OWNERSHIP}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <CardAnatomy />
        </div>
        <IdeaNote>
          Option B, first visit: the blocks keep their places and say what will fill them, and the
          rail shows a sample card, so the learner knows what they are setting up before they run a
          command.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Option C: one focused task. The page is the next card to explain, where it sits on the ladder and one button. Every
// thing else folds under it.

export function DashboardHomeOptionC() {
  const card = DUE[0];
  return (
    <AppFrame path="/dashboard">
      <Container>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <AppPageHeader
            title="Explain this one next"
            description={`Card 1 of ${DUE.length} due today, from ${card.repo}.`}
          />
          <Card size="lg">
            <CardHeader>
              <CardTitle>
                <h2>{card.decision}</h2>
              </CardTitle>
              <CardDescription>{DECISION_CARD}</CardDescription>
              <CardAction>
                <Badge>{card.step} review</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataList>
                <DataListItem>
                  <DataListLabel>Question</DataListLabel>
                  <DataListValue>{card.question}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Why</DataListLabel>
                  <DataListValue>
                    <span className="flex items-center gap-2 text-text-3">
                      <LockSimpleIcon aria-hidden="true" />
                      Locked until you answer. {ANSWER_FIRST}
                    </span>
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Where it is</DataListLabel>
                  <DataListValue>
                    <span className="flex flex-col gap-2">
                      <ScheduleLadder at={card.step} />
                      <span className="type-body-sm text-text-3">
                        You explained it on day 1. Score 2 today and it comes back on day 11; below
                        2, it steps back to day 1 and comes back tomorrow.
                      </span>
                    </span>
                  </DataListValue>
                </DataListItem>
              </DataList>
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap gap-2">
                <Link href={`/review/${card.id}`} className={buttonVariants()}>
                  Explain it
                </Link>
                <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
                  See all {DUE.length}
                </Link>
              </div>
            </CardFooter>
          </Card>
          <Collapsible>
            <CollapsibleRow summary={`Explained ${TOTAL.explained} · owned ${TOTAL.owned}`}>
              Your projects
            </CollapsibleRow>
            <CollapsibleContent>
              <div className="flex flex-col gap-3 pt-3">
                <p className="type-body-sm text-text-2">{OWNERSHIP}</p>
                <OwnershipBars />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow summary={`${ROWS.length} sessions`}>Your sessions</CollapsibleRow>
            <CollapsibleContent>
              <div className="pt-3">
                <SessionsCard />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <IdeaNote>
            Option C: the dashboard is the next card, with its question, its locked why and its
            place on the ladder spelled out for this card. Projects and sessions fold away until the
            learner asks for them.
          </IdeaNote>
        </div>
      </Container>
    </AppFrame>
  );
}

export function DashboardHomeOptionCEmpty() {
  return (
    <AppFrame path="/dashboard" sessions={[]} dueCount={0}>
      <Container>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <AppPageHeader
            title="Send your first session"
            description="One thing to do. Everything else on this page appears after it."
          />
          <Card size="lg">
            <CardHeader>
              <CardTitle>
                <h2>Two commands in your project’s terminal</h2>
              </CardTitle>
              <CardDescription>
                Secrets are redacted on your machine before the log is sent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Terminal lines={SETUP_COMMANDS} />
            </CardContent>
            <CardFooter>
              <Link href="/setup" className={buttonVariants()}>
                Open setup
              </Link>
            </CardFooter>
          </Card>
          <Collapsible>
            <CollapsibleRow summary="3 things">What happens after</CollapsibleRow>
            <CollapsibleContent>
              <DataList>
                <DataListItem>
                  <DataListLabel>Cards</DataListLabel>
                  <DataListValue>Your session becomes up to 5 cards. {DECISION_CARD}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Explain</DataListLabel>
                  <DataListValue>{ANSWER_FIRST}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Come back</DataListLabel>
                  <DataListValue>
                    <span className="flex flex-col gap-2">
                      <ScheduleLadder />
                      <span>{SCHEDULE}</span>
                    </span>
                  </DataListValue>
                </DataListItem>
              </DataList>
            </CollapsibleContent>
          </Collapsible>
          <p className="type-body-sm text-text-3">
            Working in more than one repo? Each one becomes a project here, with its own explained
            and owned count.
          </p>
          <IdeaNote>
            Option C, first visit: one task and nothing else. What comes after is one fold below,
            for the learner who wants to know before they run it.
          </IdeaNote>
        </div>
      </Container>
    </AppFrame>
  );
}
