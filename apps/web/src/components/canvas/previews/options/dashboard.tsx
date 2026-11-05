"use client";

// Three ways the dashboard could teach a newcomer on the page itself: what a decision card is, why they answer before
// they see the why, what the review days mean, explained vs owned, and what to do next. Each option has a full state
// and a first-visit state. Synthetic data only; nothing here calls an API, and no card shows its why or answer key.

import { CaretRightIcon, LockSimpleIcon, TerminalWindowIcon } from "@phosphor-icons/react";
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
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { IdeaNote, NOW } from "../parts";

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

function SessionRows({ repo = null }: { repo?: string | null }) {
  return (
    <ItemGroup>
      {ROWS.filter((s) => !repo || s.repo === repo).map((s) => (
        <SessionRow key={s.id} session={s} cardCount={s.cardCount} now={NOW} />
      ))}
    </ItemGroup>
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

/** Why the due block has no cards: the day's 5 are done, or nothing is due today. */
const EMPTY_DUE = {
  done: {
    title: "Done for today",
    body: "You've done 5 cards today. The rest come back tomorrow.",
  },
  "caught-up": {
    title: "All caught up",
    body: "Nothing is due today. Your next card is due tomorrow.",
  },
};

export function DashboardHomeOptionB({
  initialRepo = null,
  empty,
  before,
}: {
  /** The project filter to open on. */
  initialRepo?: string | null;
  /** Show the due block with no cards, and why. */
  empty?: keyof typeof EMPTY_DUE;
  /** Drawn under the header, where the real page puts a new project's question-level card. */
  before?: React.ReactNode;
} = {}) {
  const [repo, setRepo] = useState<string | null>(initialRepo);
  const due = empty ? [] : DUE.filter((card) => !repo || card.repo === repo);
  return (
    <AppFrame
      path={repo ? `/dashboard?repo=${repo}` : "/dashboard"}
      dueCount={empty ? 0 : DUE.length}
    >
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Your agent’s decisions, project by project. Open any “What’s this?” to learn the part next to it."
        />
        {before}
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
                    {empty
                      ? EMPTY_DUE[empty].title
                      : `${due.length} ${due.length === 1 ? "card is" : "cards are"} due today`}
                  </h2>
                </CardTitle>
                {empty ? (
                  <CardDescription>{EMPTY_DUE[empty].body}</CardDescription>
                ) : (
                  <CardAction>
                    <Link href="/review" className={buttonVariants()}>
                      Start review
                    </Link>
                  </CardAction>
                )}
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
