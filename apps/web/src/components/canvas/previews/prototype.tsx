"use client";

// The clickable prototype: one learner app with every screen, its states and its flows, on synthetic data.
// Screens switch with React state, never a route. Timers stand in for the server and the grader.

import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  CardsIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FireIcon,
  LaptopIcon,
  ProhibitIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  TerminalWindowIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import {
  ErrorState,
  LoadFailedState,
  OfflineState,
  SessionFailedState,
} from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/processing-state";
import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { StatRow } from "@/components/app/stat-row";
import { StatusBadge } from "@/components/app/status-badge";
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
import { CopyButton } from "@/components/ui/copy-button";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMeta,
  ItemTitle,
} from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { initialsOf } from "@/lib/auth/initials";
import { formatRelativeTime } from "@/lib/relative-time";

import { AppFrame, FRAME_USER, type FrameNavItem, LEARN_NAV } from "./frames";
import {
  DecisionCardLoading,
  ReviewCardLoading,
  SessionListLoading,
  StatRowLoading,
} from "./loading";
import { AGENTS, promptFor } from "./onboarding";
import { IdeaNote, NOW, Terminal } from "./parts";
import {
  CARDS,
  DAILY_CAP,
  DAY_NAMES,
  DEVICE_CODE,
  FIRST_PUSH,
  METER,
  NEW_CARDS,
  OWNED,
  PAST_DAYS,
  SESSIONS,
  type OwnedDecision,
  type ProtoCard,
  type ProtoSession,
  type Repo,
} from "./prototype-data";
import { grade } from "./prototype-grade";

type ScreenId =
  | "dashboard"
  | "review"
  | "session"
  | "defend"
  | "progress"
  | "report"
  | "setup"
  | "settings";
type Option = { value: string; label: string };
type SetupStep = "none" | "code" | "approved" | "waiting" | "processing" | "ready";

/** What the learner did with a card: a score, or null for "I don't know yet". */
type Answer = {
  score: Score | null;
  text: string;
  missing: string | null;
  owned: boolean;
  next: string;
};

/** The real Learn nav, with the two proposed pages (Defend it, Report) where they would sit. */
const NAV: FrameNavItem[] = [
  LEARN_NAV[0],
  LEARN_NAV[1],
  { title: "Defend it", url: "/defend", icon: <ShieldCheckIcon /> },
  LEARN_NAV[2],
  { title: "Report", url: "/report", icon: <ShareNetworkIcon /> },
  LEARN_NAV[3],
  LEARN_NAV[4],
];

const SCREEN_FOR: Record<string, ScreenId> = {
  "/dashboard": "dashboard",
  "/review": "review",
  "/defend": "defend",
  "/progress": "progress",
  "/report": "report",
  "/setup": "setup",
  "/settings": "settings",
};

const o = (value: string, label: string): Option => ({ value, label });
const FULL = o("full", "Full");
const LOADING = o("loading", "Loading");
const ERROR = o("error", "Error");
const OFFLINE = o("offline", "Offline");

/** The states the prototype bar offers for each screen. */
const STATES: Record<ScreenId, Option[]> = {
  dashboard: [FULL, LOADING, o("empty", "Empty"), ERROR, OFFLINE],
  review: [
    FULL,
    LOADING,
    o("failed", "Scoring failed"),
    o("done", "Done for today"),
    o("no-cards", "No cards"),
    OFFLINE,
  ],
  session: [
    FULL,
    LOADING,
    o("processing", "Processing"),
    o("failed", "Failed"),
    o("no-cards", "No cards"),
    ERROR,
  ],
  defend: [FULL, o("none-owned", "Nothing owned yet"), o("time-up", "Time's up"), ERROR, OFFLINE],
  progress: [FULL, LOADING, o("empty", "Empty"), ERROR],
  report: [FULL, LOADING, ERROR],
  setup: [
    o("no-device", "No device"),
    o("waiting", "Waiting for first session"),
    o("connected", "Connected"),
    OFFLINE,
  ],
  settings: [FULL, LOADING, ERROR],
};

/** A short fade and rise when a view appears. Reduced motion keeps it still. */
const ENTER = "animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** setTimeout that is cleared when the component unmounts, so no timer fires into a screen that is gone. */
function useLater() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
}

type Proto = {
  go: (screen: ScreenId) => void;
  announce: (text: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  /** Back to the full state through a short load, as a retry would. */
  retry: () => void;
};

const ProtoContext = createContext<Proto | null>(null);

function useProto() {
  const proto = useContext(ProtoContext);
  if (!proto) throw new Error("useProto needs the prototype shell");
  return proto;
}

/** The loading, error and offline views every screen shares. Null when the screen should draw its own content. */
function useCommonState(noun: string, loading: React.ReactNode) {
  const { mode, retry } = useProto();
  const again = (
    <Button variant="secondary" onClick={retry}>
      Try again
    </Button>
  );
  if (mode === "loading") return loading;
  if (mode === "error") return <LoadFailedState noun={noun} code="ERR-7F3A" action={again} />;
  if (mode === "offline") return <OfflineState noun={noun} action={again} />;
  return null;
}

/** The whole prototype. Reset remounts it, which puts every piece of state back to the start. */
export function LearnerPrototype() {
  const [run, setRun] = useState(0);
  return <PrototypeApp key={run} onReset={() => setRun((n) => n + 1)} />;
}

function PrototypeApp({ onReset }: { onReset: () => void }) {
  const later = useLater();
  const [screen, setScreen] = useState<ScreenId>("dashboard");
  const [mode, setMode] = useState("full");
  const [sessionId, setSessionId] = useState("s1");
  const [sessions, setSessions] = useState<ProtoSession[]>(SESSIONS);
  const [cards, setCards] = useState<ProtoCard[]>(CARDS);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [defended, setDefended] = useState<string[]>([]);
  const [reportOn, setReportOn] = useState(false);
  const [setup, setSetup] = useState<SetupStep>("ready");
  const [name, setName] = useState("Sam Rivera");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toastId = useRef(0);

  const announce = useCallback(
    (text: string) => {
      const id = ++toastId.current;
      setToast({ id, text });
      later(() => setToast((t) => (t?.id === id ? null : t)), 3200);
    },
    [later],
  );

  const go = (next: ScreenId) => {
    setScreen(next);
    setMode("full");
  };
  const retry = () => {
    setMode("loading");
    later(() => setMode("full"), 700);
  };

  // Derived numbers: everything on the dashboard, progress and report comes from what was done in the prototype.
  const answered = Object.keys(answers);
  const doneToday = answered.length;
  const queue = cards
    .filter((c) => c.due && !answers[c.id])
    .slice(0, Math.max(0, DAILY_CAP - doneToday));
  const waiting = cards.filter((c) => c.due && !answers[c.id]).length - queue.length;
  const gainedCards = cards.filter((c) => answers[c.id]?.owned);
  const meter = (Object.keys(METER) as Repo[]).map((repo) => ({
    repo,
    owned: METER[repo].owned + gainedCards.filter((c) => c.repo === repo).length,
    total: METER[repo].total + NEW_CARDS.filter((c) => c.repo === repo && cards.includes(c)).length,
  }));
  const ownedTotal = meter.reduce((n, m) => n + m.owned, 0);
  const cardTotal = meter.reduce((n, m) => n + m.total, 0);
  const week = [...PAST_DAYS, doneToday > 0];
  const scored = Object.values(answers).filter((a) => a.score !== null);
  const explainedPercent =
    ((32 + scored.filter((a) => a.score === 2).length) / (50 + scored.length)) * 100;
  const owned: OwnedDecision[] = [
    ...gainedCards.map((c) => ({
      id: c.id,
      repo: c.repo,
      decision: c.decision,
      quote: c.evidence,
      question: c.question,
      followUp:
        "You named the main reason. What would break first if it were reversed, and how would you notice?",
      defended: false,
    })),
    ...OWNED,
  ].map((d) => ({ ...d, defended: d.defended || defended.includes(d.id) }));

  /** Grades an answer (or records "I don't know yet") and moves the card along. */
  const record = (card: ProtoCard, text: string | null): Answer => {
    const result = text === null ? null : grade(card.ideas, text);
    const score = result?.score ?? null;
    const isOwned = score === 2 && card.day === 11;
    const next =
      score === null
        ? "Tomorrow. No score, nothing lost."
        : score < 2
          ? "Tomorrow. A miss starts it again at day 1."
          : card.day === 1
            ? "In 3 days (day 4)"
            : card.day === 4
              ? "In 7 days (day 11)"
              : "Owned. It comes back only when you defend it.";
    const answer: Answer = {
      score,
      text: text ?? "",
      missing: result?.missing ?? null,
      owned: isOwned,
      next,
    };
    setAnswers((prev) => ({ ...prev, [card.id]: answer }));
    const notes = [
      isOwned ? `+1 owned. You own ${ownedTotal + 1} of ${cardTotal}.` : "",
      doneToday === 0
        ? `Today counts: ${PAST_DAYS.filter(Boolean).length + 1} of the last 7 days.`
        : "",
    ].join(" ");
    announce(
      notes.trim() || (score === null ? "Saved. It comes back tomorrow." : "Answer scored."),
    );
    return answer;
  };

  /** The first push lands: the session turns ready and its 3 cards join the queue. */
  const finishPush = useCallback(() => {
    setSessions((prev) =>
      prev.map((s) => (s.id === FIRST_PUSH.id ? { ...s, status: "ready" } : s)),
    );
    setCards((prev) =>
      prev.some((c) => c.id === NEW_CARDS[0].id) ? prev : [...prev, ...NEW_CARDS],
    );
    setSetup("ready");
    announce(`"${FIRST_PUSH.title}" is ready: 3 new cards.`);
  }, [announce]);

  /** Moves the setup flow on. Processing is when the first session shows up in the list. */
  const toSetup = useCallback((next: SetupStep) => {
    if (next === "processing")
      setSessions((prev) =>
        prev.some((s) => s.id === FIRST_PUSH.id) ? prev : [FIRST_PUSH, ...prev],
      );
    setSetup(next);
  }, []);

  // The setup flow's simulated server: approval, the wait for a first session, then processing.
  useEffect(() => {
    if (setup === "approved") {
      const t = setTimeout(() => setSetup("waiting"), 1600);
      return () => clearTimeout(t);
    }
    if (setup === "waiting") {
      const t = setTimeout(() => toSetup("processing"), 6000);
      return () => clearTimeout(t);
    }
    if (setup === "processing") {
      const t = setTimeout(finishPush, 4000);
      return () => clearTimeout(t);
    }
  }, [setup, finishPush, toSetup]);

  const setupValue =
    mode === "offline"
      ? "offline"
      : setup === "none" || setup === "code" || setup === "approved"
        ? "no-device"
        : setup === "ready"
          ? "connected"
          : "waiting";

  const pickState = (value: string) => {
    if (screen !== "setup") return setMode(value);
    setMode(value === "offline" ? "offline" : "full");
    if (value === "no-device") setSetup("none");
    if (value === "waiting") setSetup("waiting");
    if (value === "connected" && setup !== "ready") {
      if (sessions.some((s) => s.id === FIRST_PUSH.id)) finishPush();
      else setSetup("ready");
    }
  };

  const openSession = (id: string) => {
    setSessionId(id);
    go("session");
  };

  const session = sessions.find((s) => s.id === sessionId) ?? sessions[0];
  const firstName = name.trim().split(" ")[0] || "there";

  const bar = (
    <div className="flex shrink-0 items-center gap-3 border-b border-dashed border-hair bg-well px-4 py-2">
      <Badge variant="warning">Prototype control</Badge>
      <span id="proto-state-label" className="type-label-sm text-text-2">
        State
      </span>
      <SegmentedControl
        size="xs"
        aria-labelledby="proto-state-label"
        value={screen === "setup" ? setupValue : mode}
        onValueChange={pickState}
      >
        {STATES[screen].map((s) => (
          <SegmentedControlItem key={s.value} value={s.value}>
            {s.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <div className="ms-auto">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          Reset prototype
        </Button>
      </div>
    </div>
  );

  return (
    <ProtoContext.Provider value={{ go, announce, mode, setMode, retry }}>
      <AppFrame
        path={screen === "session" ? `/s/${sessionId}` : `/${screen}`}
        crumb={screen === "defend" ? "Defend it" : screen === "report" ? "Report" : undefined}
        nav={NAV}
        sessions={sessions}
        dueCount={queue.length}
        user={{ ...FRAME_USER, name, initials: initialsOf(name, FRAME_USER.detail) }}
        onNavigate={(url) => go(SCREEN_FOR[url] ?? "dashboard")}
        onOpenSession={openSession}
        bar={bar}
        overlay={
          <output
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
          >
            {toast && (
              <span
                key={toast.id}
                className={`rounded-soft border border-hair bg-page px-3 py-2 type-label ${ENTER}`}
              >
                {toast.text}
              </span>
            )}
          </output>
        }
      >
        <Container key={`${screen}-${sessionId}`} className={ENTER}>
          {screen === "dashboard" && (
            <DashboardScreen
              firstName={firstName}
              sessions={sessions}
              cards={cards}
              meter={meter}
              ownedTotal={ownedTotal}
              cardTotal={cardTotal}
              gained={gainedCards.length}
              week={week}
              due={queue.length}
              doneToday={doneToday}
              explainedPercent={explainedPercent}
              onOpen={openSession}
            />
          )}
          {screen === "review" && (
            <ReviewScreen
              queue={queue}
              doneToday={doneToday}
              waiting={waiting}
              hasCards={cards.length > 0}
              answers={answers}
              cards={cards}
              ownedTotal={ownedTotal}
              cardTotal={cardTotal}
              gained={gainedCards.length}
              onRecord={record}
            />
          )}
          {screen === "session" && (
            <SessionScreen
              session={session}
              cards={cards.filter((c) => c.sessionId === session.id)}
              answers={answers}
              onRecord={record}
            />
          )}
          {screen === "defend" && (
            <DefendScreen owned={owned} onDefended={(id) => setDefended((prev) => [...prev, id])} />
          )}
          {screen === "progress" && (
            <ProgressScreen
              cards={cards}
              answers={answers}
              due={queue.length}
              sessionsThisWeek={sessions.length}
              explainedPercent={explainedPercent}
            />
          )}
          {screen === "report" && (
            <ReportScreen
              name={name}
              owned={owned}
              on={reportOn}
              onToggle={setReportOn}
              ownedTotal={ownedTotal}
            />
          )}
          {screen === "setup" && (
            <SetupScreen
              step={setup}
              onStep={toSetup}
              name={name}
              pushed={cards.some((c) => c.id === NEW_CARDS[0].id)}
            />
          )}
          {screen === "settings" && <SettingsScreen name={name} onName={setName} />}
        </Container>
      </AppFrame>
    </ProtoContext.Provider>
  );
}

/* Dashboard */

function DashboardScreen({
  firstName,
  sessions,
  cards,
  meter,
  ownedTotal,
  cardTotal,
  gained,
  week,
  due,
  doneToday,
  explainedPercent,
  onOpen,
}: {
  firstName: string;
  sessions: ProtoSession[];
  cards: ProtoCard[];
  meter: { repo: Repo; owned: number; total: number }[];
  ownedTotal: number;
  cardTotal: number;
  gained: number;
  week: boolean[];
  due: number;
  doneToday: number;
  explainedPercent: number;
  onOpen: (id: string) => void;
}) {
  const { go, mode } = useProto();
  const common = useCommonState(
    "your sessions",
    <>
      <StatRowLoading />
      <SessionListLoading rows={3} />
    </>,
  );
  const practised = week.filter(Boolean).length;
  const header = (
    <AppPageHeader
      title="Dashboard"
      description={`Hi ${firstName}. Explain your agent's decisions back, about 2 minutes a day.`}
      actions={
        due > 0 ? (
          <Button onClick={() => go("review")}>Start review · {due}</Button>
        ) : (
          <Button variant="secondary" onClick={() => go("progress")}>
            See progress
          </Button>
        )
      }
    />
  );
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  if (mode === "empty")
    return (
      <>
        {header}
        <EmptyState
          icon={TerminalWindowIcon}
          title="No sessions yet"
          description="Your sessions appear here once the CLI is set up. Each one becomes up to 5 decision cards to explain back on day 1, 4 and 11."
          action={<Button onClick={() => go("setup")}>Set up the CLI</Button>}
        />
      </>
    );
  return (
    <>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>
            You own {ownedTotal} of {cardTotal} decisions
          </CardTitle>
          <CardDescription>
            {gained > 0
              ? `+${gained} today. That's ${plural(gained, "decision")} you no longer lean on the agent for.`
              : "Owned means you explained it right on day 11. The rest is debt you pay down a card at a time."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {meter.map(({ repo, owned, total }) => (
              <Progress key={repo} value={Math.round((owned / total) * 100)}>
                <ProgressLabel>{repo}</ProgressLabel>
                <ProgressValue>{() => `${owned} of ${total}`}</ProgressValue>
              </Progress>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-soft border border-hair p-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 type-label">
            <FireIcon aria-hidden="true" />
            {practised} of the last 7 days
          </span>
          <span className="type-body-sm text-text-2">
            {doneToday > 0 ? "Today counts. " : "Today is open: one card counts. "}
            Missed days never reset anything.
          </span>
        </div>
        <ul aria-label={`Practised ${practised} of the last 7 days`} className="flex gap-2">
          {week.map((done, i) => (
            <li key={DAY_NAMES[i]} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={`size-4 rounded-full transition-colors duration-500 motion-reduce:transition-none ${done ? "bg-accent-line" : "bg-cell-quiet"}`}
              />
              <span className="type-label-sm text-text-3">
                {DAY_NAMES[i]}
                <span className="sr-only">{done ? ", practised" : ", missed"}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <StatRow
        cardsDueToday={due}
        sessionsThisWeek={sessions.length}
        explainedPercent={explainedPercent}
      />

      <section aria-labelledby="proto-sessions" className="flex flex-col gap-2">
        <span id="proto-sessions" className="type-heading-sm">
          Sessions
        </span>
        <ItemGroup aria-label="Sessions">
          {sessions.map((s) => {
            const count = cards.filter((c) => c.sessionId === s.id).length;
            // ItemGroup is role="list", so each row is a listitem, as SessionRow does it.
            return (
              <Item
                key={s.id}
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="listitem"
                data-status={s.status === "failed" ? "fail" : undefined}
              >
                <ItemContent>
                  <ItemTitle>
                    <Button variant="link" onClick={() => onOpen(s.id)}>
                      {s.title}
                    </Button>
                  </ItemTitle>
                  <ItemDescription>
                    {s.status === "failed" ? (
                      s.error
                    ) : (
                      <span className="type-code-sm">{s.repo}</span>
                    )}
                  </ItemDescription>
                </ItemContent>
                {s.status === "ready" && <ItemMeta>{plural(count, "card")}</ItemMeta>}
                <ItemMeta>
                  <time dateTime={s.created_at}>{formatRelativeTime(s.created_at, NOW)}</time>
                </ItemMeta>
                <StatusBadge status={s.status} live={s.status === "processing"} />
              </Item>
            );
          })}
        </ItemGroup>
      </section>
    </>
  );
}

/* Review */

function ReviewScreen({
  queue,
  doneToday,
  waiting,
  hasCards,
  answers,
  cards,
  ownedTotal,
  cardTotal,
  gained,
  onRecord,
}: {
  queue: ProtoCard[];
  doneToday: number;
  waiting: number;
  hasCards: boolean;
  answers: Record<string, Answer>;
  cards: ProtoCard[];
  ownedTotal: number;
  cardTotal: number;
  gained: number;
  onRecord: (card: ProtoCard, text: string | null) => Answer;
}) {
  const { go, mode, setMode } = useProto();
  const later = useLater();
  const fieldId = useId();
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<
    | { kind: "answer" }
    | { kind: "scoring"; card: ProtoCard }
    | { kind: "result"; card: ProtoCard; answer: Answer }
  >({ kind: "answer" });
  const common = useCommonState("today's review", <ReviewCardLoading />);
  const header = (
    <AppPageHeader title="Review" description="Explain it first. The why shows after you answer." />
  );

  const submit = (card: ProtoCard) => {
    if (!draft.trim()) return;
    setPhase({ kind: "scoring", card });
    later(() => {
      const answer = onRecord(card, draft);
      setDraft("");
      setPhase({ kind: "result", card, answer });
    }, 1500);
  };
  const dontKnow = (card: ProtoCard) => {
    const answer = onRecord(card, null);
    setDraft("");
    setPhase({ kind: "result", card, answer });
  };

  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  if (mode === "no-cards" || (!hasCards && phase.kind === "answer"))
    return (
      <>
        {header}
        <EmptyState
          icon={CardsIcon}
          title="No cards yet"
          description="Cards come from your agent sessions. Set up the CLI, and each session you send becomes up to 5 cards to explain back."
          action={<Button onClick={() => go("setup")}>Set up the CLI</Button>}
        />
      </>
    );

  const current = queue[0];
  if (mode === "failed")
    return (
      <>
        {header}
        <ErrorState
          title="Your answer couldn't be scored"
          message="The grader didn't answer in time. Your answer is kept; try again in a minute."
          action={
            <Button
              onClick={() => {
                setMode("full");
                if (current && draft.trim()) submit(current);
              }}
            >
              Try again
            </Button>
          }
        />
      </>
    );

  if (mode === "done" || (phase.kind === "answer" && !current))
    return (
      <>
        {header}
        {doneToday === 0 && mode !== "done" ? (
          <EmptyState
            icon={CheckCircleIcon}
            title="All caught up"
            description="Nothing is due today. New cards arrive when your next session ends."
            action={
              <Button variant="secondary" onClick={() => go("progress")}>
                See your progress
              </Button>
            }
          />
        ) : (
          <DoneForToday
            done={mode === "done" ? DAILY_CAP : doneToday}
            gained={gained}
            ownedTotal={ownedTotal}
            cardTotal={cardTotal}
            waiting={waiting}
            today={cards.filter((c) => answers[c.id])}
            answers={answers}
          />
        )}
      </>
    );

  // Until it is scored the card is still in the queue; after, it is in doneToday. The sum holds either way.
  const total = Math.min(DAILY_CAP, doneToday + queue.length);
  const position = phase.kind === "result" ? doneToday : doneToday + 1;
  const card = phase.kind === "answer" ? current : phase.card;

  return (
    <>
      {header}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="type-label text-text-2">
            Card {Math.min(position, total)} of {total} today
          </span>
          <Badge variant="outline">Day {card.day}</Badge>
        </div>
        <Progress value={Math.round((doneToday / DAILY_CAP) * 100)} aria-label="Today's cards done">
          <ProgressValue>{() => `${doneToday} of ${DAILY_CAP} done`}</ProgressValue>
        </Progress>
      </div>
      <span className="type-heading">{card.decision}</span>

      {phase.kind === "answer" && (
        <Card>
          <CardHeader>
            <CardTitle>{card.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor={fieldId}>Your explanation</FieldLabel>
              <Textarea
                id={fieldId}
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(card);
                }}
              />
              <FieldDescription>
                In your own words. <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> submits.
              </FieldDescription>
            </Field>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2">
              <Button disabled={!draft.trim()} onClick={() => submit(card)}>
                Submit
              </Button>
              <Button variant="secondary" onClick={() => dontKnow(card)}>
                I don&rsquo;t know yet
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {phase.kind === "scoring" && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Spinner />
                Scoring your answer
              </span>
            </CardTitle>
            <CardDescription>
              Checking it against what was actually decided in the session.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {phase.kind === "result" && (
        <ResultCard
          card={phase.card}
          answer={phase.answer}
          last={queue.length === 0}
          onNext={() => setPhase({ kind: "answer" })}
        />
      )}

      <IdeaNote>
        Prototype grader: it looks for the card&rsquo;s 2 key ideas in your words. No model is
        called.
      </IdeaNote>
    </>
  );
}

function ResultCard({
  card,
  answer,
  last,
  onNext,
}: {
  card: ProtoCard;
  answer: Answer;
  last: boolean;
  onNext: () => void;
}) {
  const title =
    answer.score === null
      ? "Here's the why"
      : answer.score === 2
        ? "Explained"
        : answer.score === 1
          ? "Partly right"
          : "Not yet";
  return (
    <div className={ENTER}>
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              {title}
              {answer.owned && <Badge variant="success">+1 owned</Badge>}
            </span>
          </CardTitle>
          <CardDescription>
            {answer.owned
              ? "One less decision you lean on the agent for."
              : answer.score === null
                ? "No score, and your streak is safe. It comes back tomorrow."
                : answer.next}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataList>
            {answer.score !== null && (
              <DataListItem>
                <DataListLabel>Score</DataListLabel>
                <DataListValue>
                  <ScoreBadge score={answer.score} />
                </DataListValue>
              </DataListItem>
            )}
            {answer.score !== null && answer.score < 2 && answer.missing && (
              <DataListItem>
                <DataListLabel>What was missing</DataListLabel>
                <DataListValue>{answer.missing}</DataListValue>
              </DataListItem>
            )}
            <DataListItem>
              <DataListLabel>Why</DataListLabel>
              <DataListValue>{card.why}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Evidence</DataListLabel>
              <DataListValue>
                &ldquo;{card.evidence}&rdquo;{" "}
                <span className="type-code-sm text-text-3">{card.file}</span>
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Next review</DataListLabel>
              <DataListValue>{answer.next}</DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <CardFooter>
          {/* Focus moves to the next step so keyboard users carry on without hunting for it. */}
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
          <Button autoFocus onClick={onNext}>
            {last ? "Finish today" : "Next card"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/** A ring that fills from empty to `value` (0 to 1) just after it appears. Reduced motion shows it full at once. */
function Ring({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 80);
    return () => clearTimeout(t);
  }, [value]);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-24 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-cell-quiet" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - shown)}
        className="stroke-accent-line transition-all duration-1000 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

function DoneForToday({
  done,
  gained,
  ownedTotal,
  cardTotal,
  waiting,
  today,
  answers,
}: {
  done: number;
  gained: number;
  ownedTotal: number;
  cardTotal: number;
  waiting: number;
  today: ProtoCard[];
  answers: Record<string, Answer>;
}) {
  const { go } = useProto();
  // The meter starts where the day began and fills to where it is now.
  const [shownOwned, setShownOwned] = useState(ownedTotal - gained);
  useEffect(() => {
    const t = setTimeout(() => setShownOwned(ownedTotal), 400);
    return () => clearTimeout(t);
  }, [ownedTotal]);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-6">
          <div className="relative grid place-items-center">
            <Ring value={Math.min(done, DAILY_CAP) / DAILY_CAP} />
            <span className="absolute type-label tabular-nums">
              {Math.min(done, DAILY_CAP)} of {DAILY_CAP}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>Done for today</CardTitle>
            <CardDescription>
              {gained > 0
                ? `+${plural(gained, "decision")} owned today.`
                : "Nothing owned today, and that's fine: every answer moved a card along."}{" "}
              {waiting > 0
                ? `${plural(waiting, "more card")} ${waiting === 1 ? "waits" : "wait"} for tomorrow, so nothing piles up.`
                : "Back tomorrow."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Progress value={Math.round((shownOwned / cardTotal) * 100)}>
            <ProgressLabel>You own</ProgressLabel>
            <ProgressValue>{() => `${shownOwned} of ${cardTotal}`}</ProgressValue>
          </Progress>
          {today.length > 0 && (
            <ul aria-label="Today's cards" className="flex flex-col gap-2">
              {today.map((c) => {
                const a = answers[c.id];
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 type-body-sm">
                    <span>{c.decision}</span>
                    {a.owned ? (
                      <Badge variant="success">+1 owned</Badge>
                    ) : a.score === null ? (
                      <Badge variant="outline">Back tomorrow</Badge>
                    ) : (
                      <ScoreBadge score={a.score} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          <Button onClick={() => go("dashboard")}>Back to dashboard</Button>
          <Button variant="secondary" onClick={() => go("progress")}>
            See progress
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/* Session detail */

function SessionScreen({
  session,
  cards,
  answers,
  onRecord,
}: {
  session: ProtoSession;
  cards: ProtoCard[];
  answers: Record<string, Answer>;
  onRecord: (card: ProtoCard, text: string | null) => Answer;
}) {
  const { go, mode } = useProto();
  const common = useCommonState(
    "this session",
    <>
      <DecisionCardLoading />
      <DecisionCardLoading />
    </>,
  );
  const status =
    mode === "processing"
      ? "processing"
      : mode === "failed"
        ? "failed"
        : mode === "no-cards"
          ? "ready"
          : session.status;
  return (
    <>
      <AppPageHeader
        title={session.title}
        description={`${session.repo} · ${session.branch} · ${session.minutes} min · ${session.events} events`}
        actions={
          <Button variant="ghost" onClick={() => go("dashboard")}>
            <ArrowLeftIcon aria-hidden="true" />
            Dashboard
          </Button>
        }
      />
      {common ??
        (status === "processing" ? (
          <ProcessingState status="processing" />
        ) : status === "failed" ? (
          <SessionFailedState
            error={session.error ?? "The log was empty after redaction."}
            action={
              <Button variant="secondary" onClick={() => go("setup")}>
                How to push again
              </Button>
            }
          />
        ) : mode === "no-cards" || cards.length === 0 ? (
          <EmptyState
            icon={CardsIcon}
            title="No cards from this session"
            description="Each card needs an exact quote from the session to back it, and this one had none. Sessions where you talk through options give the most."
            action={
              <Button variant="secondary" onClick={() => go("dashboard")}>
                See your sessions
              </Button>
            }
          />
        ) : (
          cards.map((card) =>
            answers[card.id] ? (
              <AnsweredCard key={card.id} card={card} answer={answers[card.id]} />
            ) : (
              <UnansweredCard key={card.id} card={card} onRecord={onRecord} />
            ),
          )
        ))}
    </>
  );
}

function AnsweredCard({ card, answer }: { card: ProtoCard; answer: Answer }) {
  return (
    <div className={ENTER}>
      <Card>
        <CardHeader>
          <CardTitle>{card.decision}</CardTitle>
          <CardDescription>{card.question}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>You said</DataListLabel>
              <DataListValue>{answer.text || "I don't know yet"}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Why</DataListLabel>
              <DataListValue>{card.why}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Evidence</DataListLabel>
              <DataListValue>&ldquo;{card.evidence}&rdquo;</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Next review</DataListLabel>
              <DataListValue>{answer.next}</DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        <CardFooter>
          {answer.owned ? (
            <Badge variant="success">Owned</Badge>
          ) : answer.score === null ? (
            <Badge variant="outline">No score yet</Badge>
          ) : (
            <ScoreBadge score={answer.score} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

/** An unanswered card shows only the decision, the question and the box: the why is never on the page yet. */
function UnansweredCard({
  card,
  onRecord,
}: {
  card: ProtoCard;
  onRecord: (card: ProtoCard, text: string | null) => Answer;
}) {
  const later = useLater();
  const fieldId = useId();
  const [draft, setDraft] = useState("");
  const [scoring, setScoring] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{card.decision}</CardTitle>
        <CardDescription>{card.question}</CardDescription>
      </CardHeader>
      <CardContent>
        {scoring ? (
          <span className="flex items-center gap-2 type-body-sm text-text-2">
            <Spinner />
            Scoring your answer
          </span>
        ) : (
          <Field>
            <FieldLabel htmlFor={fieldId}>Your explanation</FieldLabel>
            <Textarea
              id={fieldId}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </Field>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          <Button
            disabled={!draft.trim() || scoring}
            onClick={() => {
              setScoring(true);
              later(() => onRecord(card, draft), 1500);
            }}
          >
            Submit
          </Button>
          <Button variant="secondary" disabled={scoring} onClick={() => onRecord(card, null)}>
            I don&rsquo;t know yet
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/* Defend it */

type DefendPhase = "start" | "answer" | "thinking" | "followup" | "grading" | "result";

/** A field that refuses paste and drop, and says so the moment someone tries. */
function DefendField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const later = useLater();
  const id = useId();
  const [blocked, setBlocked] = useState(0);
  const refuse = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    const n = blocked + 1;
    setBlocked(n);
    later(() => setBlocked((b) => (b === n ? 0 : b)), 4000);
  };
  return (
    <Field>
      <FieldLabel htmlFor={id}>Your answer</FieldLabel>
      <Textarea
        id={id}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
          "Paste and drop are off here."
        )}
      </FieldDescription>
    </Field>
  );
}

function DefendScreen({
  owned,
  onDefended,
}: {
  owned: OwnedDecision[];
  onDefended: (id: string) => void;
}) {
  const { go, mode, setMode, announce } = useProto();
  const later = useLater();
  const [pick, setPick] = useState(() => owned.find((d) => !d.defended)?.id ?? owned[0]?.id);
  const [phase, setPhase] = useState<DefendPhase>("start");
  const [left, setLeft] = useState(180);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [used, setUsed] = useState<[number, number]>([0, 0]);
  const [score, setScore] = useState<Score>(0);
  const common = useCommonState("Defend it", null);
  const decision = owned.find((d) => d.id === pick) ?? owned[0];
  const timed = phase === "answer" || phase === "followup";
  const running = timed && left > 0;
  // Time's up is derived, not stored: the clock reached 0 while a question was open.
  const timedOut = timed && left === 0;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!timed) return;
    if (left === 60) announce("1 minute left.");
    if (left === 30) announce("30 seconds left.");
    if (left === 0) announce("Time's up. What you typed is kept.");
  }, [left, timed, announce]);

  const header = (
    <AppPageHeader
      title="Defend it"
      description="One decision you own, 3 minutes, no paste, one follow-up. Like an interview."
    />
  );
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  if (mode === "none-owned" || !decision)
    return (
      <>
        {header}
        <EmptyState
          icon={ShieldCheckIcon}
          title="Nothing to defend yet"
          description="Defend it picks from decisions you own: explained right on day 1, 4 and 11. Your first one is due in 5 days."
          action={
            <Button variant="secondary" onClick={() => go("review")}>
              Go to today&rsquo;s review
            </Button>
          }
        />
      </>
    );

  const begin = () => {
    setFirst("");
    setSecond("");
    setLeft(180);
    setPhase("answer");
    setMode("full");
  };
  const another = () => {
    const next =
      owned.find((d) => !d.defended && d.id !== decision.id) ??
      owned.find((d) => d.id !== decision.id);
    if (next) setPick(next.id);
    setPhase("start");
    setMode("full");
  };
  const toFollowUp = () => {
    setUsed([180 - left, 0]);
    setPhase("thinking");
    later(() => {
      setLeft(120);
      setPhase("followup");
      announce("Follow-up question ready. 2 minutes.");
    }, 1400);
  };
  const finish = () => {
    setUsed(([a]) => [a, 120 - left]);
    setPhase("grading");
    later(() => {
      const s: Score =
        words(first) >= 12 && words(second) >= 12 ? 2 : words(first) + words(second) > 0 ? 1 : 0;
      setScore(s);
      if (s === 2) onDefended(decision.id);
      setPhase("result");
      announce(s === 2 ? "Defended (timed, follow-up)." : "Not defended this time.");
    }, 1500);
  };

  if (mode === "time-up" || timedOut)
    return (
      <>
        {header}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <TimerIcon aria-hidden="true" />
                Time&rsquo;s up
              </span>
            </CardTitle>
            <CardDescription>
              We kept what you typed. Nothing counts against you, and you can defend this one again
              tomorrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataList>
              <DataListItem>
                <DataListLabel>Decision</DataListLabel>
                <DataListValue>{decision.decision}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>You wrote</DataListLabel>
                <DataListValue>{plural(words(first) + words(second), "word")}</DataListValue>
              </DataListItem>
            </DataList>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2">
              <Button onClick={another}>Try another decision</Button>
              <Button variant="secondary" onClick={() => go("dashboard")}>
                Back to dashboard
              </Button>
            </div>
          </CardFooter>
        </Card>
      </>
    );

  return (
    <>
      {header}
      {phase === "start" && (
        <Card>
          <CardHeader>
            <CardTitle>{decision.decision}</CardTitle>
            <CardDescription>
              Picked from the decisions you own. The clock starts when you press start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataList>
              <DataListItem>
                <DataListLabel>Repo</DataListLabel>
                <DataListValue>{decision.repo}</DataListValue>
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
            <div className="flex gap-2">
              <Button onClick={begin}>Start the timer</Button>
              <Button variant="ghost" onClick={another}>
                Pick another
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {(phase === "answer" || phase === "followup") && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="type-label text-text-2">
              {phase === "answer" ? "Question 1 of 2" : "Follow-up"}
            </span>
            <Badge variant={left <= 30 ? "warning" : "outline"}>
              <TimerIcon aria-hidden="true" />
              <span className="tabular-nums">{clock(left)}</span>
              <span className="sr-only"> left</span>
            </Badge>
          </div>
          <span className="type-heading">{decision.decision}</span>
          <Card>
            <CardHeader>
              <CardTitle>{phase === "answer" ? decision.question : decision.followUp}</CardTitle>
              {phase === "followup" && (
                <CardDescription>
                  Asked by the AI from your first answer and the session evidence.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <DefendField
                key={phase}
                value={phase === "answer" ? first : second}
                onChange={phase === "answer" ? setFirst : setSecond}
              />
            </CardContent>
            <CardFooter>
              {phase === "answer" ? (
                <Button disabled={!first.trim()} onClick={toFollowUp}>
                  Next
                </Button>
              ) : (
                <Button disabled={!second.trim()} onClick={finish}>
                  Finish
                </Button>
              )}
            </CardFooter>
          </Card>
        </>
      )}

      {(phase === "thinking" || phase === "grading") && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Spinner />
                {phase === "thinking"
                  ? "Writing a follow-up from your answer"
                  : "Grading both answers"}
              </span>
            </CardTitle>
            <CardDescription>
              {phase === "thinking"
                ? "The clock is paused."
                : "Against the decision's stored evidence."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {phase === "result" && (
        <div className={ENTER}>
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  {score === 2 ? "Defended" : "Not defended this time"}
                  {score === 2 && (
                    <Badge variant="success">
                      <ShieldCheckIcon aria-hidden="true" />
                      Defended (timed, follow-up)
                    </Badge>
                  )}
                </span>
              </CardTitle>
              <CardDescription>
                {score === 2
                  ? "Shown on your ownership report if you share it."
                  : "It stays owned. Try this one again tomorrow; both answers need the reason in your own words."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataList>
                <DataListItem>
                  <DataListLabel>Score</DataListLabel>
                  <DataListValue>
                    <ScoreBadge score={score} />
                  </DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Time</DataListLabel>
                  <DataListValue>
                    {clock(used[0])} of 3:00, follow-up {clock(used[1])} of 2:00
                  </DataListValue>
                </DataListItem>
              </DataList>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                <Button onClick={another}>Defend another</Button>
                {score === 2 && (
                  <Button variant="secondary" onClick={() => go("report")}>
                    See your report
                  </Button>
                )}
                <Button variant="ghost" onClick={() => go("dashboard")}>
                  Back to dashboard
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      <IdeaNote>
        Prototype: defended when both answers have 12 words or more. Blocking paste only raises the
        bar, so the app never says &ldquo;verified&rdquo;.
      </IdeaNote>
    </>
  );
}

/* Progress */

const STAGES = ["New", "Day 1", "Day 4", "Day 11", "Owned"] as const;
const STAGE_BASE: Record<(typeof STAGES)[number], number> = {
  New: 6,
  "Day 1": 5,
  "Day 4": 7,
  "Day 11": 4,
  Owned: 17,
};

function ProgressScreen({
  cards,
  answers,
  due,
  sessionsThisWeek,
  explainedPercent,
}: {
  cards: ProtoCard[];
  answers: Record<string, Answer>;
  due: number;
  sessionsThisWeek: number;
  explainedPercent: number;
}) {
  const { go, mode } = useProto();
  const common = useCommonState("your progress", <StatRowLoading />);
  const header = (
    <AppPageHeader title="Progress" description="Where every card is on its way to owned." />
  );
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  if (mode === "empty")
    return (
      <>
        {header}
        <EmptyState
          icon={ChartLineUpIcon}
          title="No reviews yet"
          description="Your progress shows here after you explain back your first card."
          action={
            <Button variant="secondary" onClick={() => go("review")}>
              Open the review queue
            </Button>
          }
        />
      </>
    );

  const stages = { ...STAGE_BASE };
  stages["Day 1"] += NEW_CARDS.filter((c) => cards.includes(c)).length;
  for (const card of cards) {
    const a = answers[card.id];
    if (!a || a.score === null) continue;
    const from = `Day ${card.day}` as const;
    const to =
      a.score < 2 ? "Day 1" : card.day === 1 ? "Day 4" : card.day === 4 ? "Day 11" : "Owned";
    stages[from] -= 1;
    stages[to] += 1;
  }
  const total = STAGES.reduce((n, s) => n + stages[s], 0);
  const today = cards.filter((c) => answers[c.id]);

  return (
    <>
      {header}
      <StatRow
        cardsDueToday={due}
        sessionsThisWeek={sessionsThisWeek}
        explainedPercent={explainedPercent}
      />
      <Card>
        <CardHeader>
          <CardTitle>Where your {total} cards are</CardTitle>
          <CardDescription>
            A miss sends a card back to day 1. Owned cards stay owned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {STAGES.map((s) => (
              <Progress key={s} value={Math.round((stages[s] / total) * 100)}>
                <ProgressLabel>{s}</ProgressLabel>
                <ProgressValue>{() => String(stages[s])}</ProgressValue>
              </Progress>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>
            {today.length > 0
              ? `${plural(today.length, "card")} answered.`
              : "Nothing answered yet today. One card counts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {today.length > 0 ? (
            <ul aria-label="Answered today" className="flex flex-col gap-2">
              {today.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 type-body-sm">
                  <span>{c.decision}</span>
                  <span className="type-body-sm text-text-2">{answers[c.id].next}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Button onClick={() => go("review")}>Start review</Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* Report */

function ReportScreen({
  name,
  owned,
  on,
  onToggle,
  ownedTotal,
}: {
  name: string;
  owned: OwnedDecision[];
  on: boolean;
  onToggle: (on: boolean) => void;
  ownedTotal: number;
}) {
  const { announce } = useProto();
  const switchId = useId();
  const common = useCommonState("your report", <SessionListLoading rows={3} />);
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") || "you";
  const link = `https://coach.ziaa.me/r/${slug}`;
  const header = (
    <AppPageHeader
      title="Report"
      description="A link that shows which decisions you own. Off until you turn it on."
    />
  );
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  return (
    <>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>Your ownership report</CardTitle>
          <CardDescription>
            {on
              ? "On. Anyone with the link sees the decisions below and their quotes, never answer keys or raw logs."
              : "Off. Turn it on to get a link you can put on a CV or a PR."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal">
              <Switch
                id={switchId}
                checked={on}
                onCheckedChange={(next) => {
                  onToggle(next);
                  announce(
                    next ? "Report on. The link works now." : "Report off. The link stops working.",
                  );
                }}
              />
              <FieldLabel htmlFor={switchId}>Share my report</FieldLabel>
            </Field>
            {on && (
              <div className={`flex items-center justify-between gap-3 ${ENTER}`}>
                <span className="type-code-sm text-text-2">{link}</span>
                <CopyButton value={link} label="Link" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {on && (
        <section aria-labelledby="proto-report-list" className={`flex flex-col gap-3 ${ENTER}`}>
          <span id="proto-report-list" className="type-heading-sm">
            {name} owns {ownedTotal} decisions
          </span>
          {owned.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle>{d.decision}</CardTitle>
                <CardDescription>
                  &ldquo;{d.quote}&rdquo; · {d.repo}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                {d.defended ? (
                  <Badge variant="success">
                    <ShieldCheckIcon aria-hidden="true" />
                    Defended (timed, follow-up)
                  </Badge>
                ) : (
                  <Badge variant="outline">Owned: explained on day 11</Badge>
                )}
              </CardFooter>
            </Card>
          ))}
          <span className="type-body-sm text-text-2">
            And {plural(ownedTotal - owned.length, "more decision")} from older sessions.
          </span>
        </section>
      )}
    </>
  );
}

/* Setup */

function SetupScreen({
  step,
  onStep,
  name,
  pushed,
}: {
  step: SetupStep;
  onStep: (step: SetupStep) => void;
  name: string;
  pushed: boolean;
}) {
  const { go, announce } = useProto();
  const common = useCommonState("setup", null);
  const [devices, setDevices] = useState([
    "MacBook Pro · session-coach 0.2.0",
    "Work desktop · session-coach 0.1.1",
  ]);
  const header = (
    <AppPageHeader
      title="Setup"
      description="Copy the prompt, paste it into your agent, approve once in the browser. About a minute."
    />
  );
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );

  const terminal =
    step === "code"
      ? [
          "$ npx session-coach login",
          "",
          `Your code: ${DEVICE_CODE}`,
          `Opening https://coach.ziaa.me/cli/approve?code=${DEVICE_CODE}`,
          "",
          "Waiting for you to approve in the browser...",
        ]
      : [
          "$ npx session-coach login",
          "",
          `Approved. Signed in as sam@example.com (${name}).`,
          "Token saved to ~/.session-coach/config.json",
        ];

  return (
    <>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>Set up with your AI</CardTitle>
          <CardDescription>
            The prompt never holds a token: login happens in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude">
            <TabsList>
              {AGENTS.map(({ id, name: agentName, icon: AgentIcon }) => (
                <TabsTrigger key={id} value={id}>
                  <AgentIcon aria-hidden="true" />
                  {agentName}
                </TabsTrigger>
              ))}
            </TabsList>
            {AGENTS.map((agent) => (
              <TabsContent key={agent.id} value={agent.id}>
                <div className="flex flex-col gap-3 pt-3">
                  <pre className="overflow-auto well p-4 type-code-sm whitespace-pre-wrap text-text-1">
                    {promptFor(agent)}
                  </pre>
                  <div>
                    <CopyButton value={promptFor(agent)} label="Prompt" />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <section aria-labelledby="proto-connect" className="flex flex-col gap-3">
        <span id="proto-connect" className="type-heading-sm">
          This computer
        </span>

        {step === "none" && (
          <Card>
            <CardHeader>
              <CardTitle>No computer connected yet</CardTitle>
              <CardDescription>
                Run the prompt above in your agent, or connect here and run the login yourself.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => onStep("code")}>Connect this computer</Button>
            </CardFooter>
          </Card>
        )}

        {(step === "code" || step === "approved") && (
          <div className="grid grid-cols-2 gap-4">
            <Terminal lines={terminal} />
            {step === "code" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connect the CLI on this computer?</CardTitle>
                  <CardDescription>
                    Check the code matches the one in your terminal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="type-stat tabular-nums">{DEVICE_CODE}</span>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        onStep("approved");
                        announce("CLI connected. Your terminal is signed in.");
                      }}
                    >
                      Connect
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onStep(devices.length ? "ready" : "none")}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <div className={ENTER}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <span className="flex items-center gap-2">
                        <CheckCircleIcon aria-hidden="true" />
                        CLI connected
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Your terminal is signed in. Next, a first session.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        )}

        {step === "waiting" && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Spinner />
                  Waiting for your first session
                </span>
              </CardTitle>
              <CardDescription>
                Finish any agent session in a project with the hook on. Its cards appear here in
                about a minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Terminal lines={["$ npx session-coach push --latest"]} />
            </CardContent>
            <CardFooter>
              <Button variant="secondary" onClick={() => onStep("processing")}>
                Push one now
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardHeader>
              <CardTitle>Your first session is in</CardTitle>
              <CardDescription>
                &ldquo;{FIRST_PUSH.title}&rdquo; · {FIRST_PUSH.repo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessingState status="processing" />
            </CardContent>
          </Card>
        )}

        {step === "ready" && (
          <>
            {pushed && (
              <div className={ENTER}>
                <Card>
                  <CardHeader>
                    <CardTitle>3 cards ready from &ldquo;{FIRST_PUSH.title}&rdquo;</CardTitle>
                    <CardDescription>
                      Explain them back today, then on day 1, 4 and 11.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button onClick={() => go("review")}>Start review</Button>
                  </CardFooter>
                </Card>
              </div>
            )}
            <ItemGroup aria-label="Connected devices">
              {devices.map((d, i) => (
                <Item key={d} variant="outline">
                  <LaptopIcon aria-hidden="true" />
                  <ItemContent>
                    <ItemTitle>{d}</ItemTitle>
                    <ItemDescription>
                      {i === 0
                        ? "Last push 12 minutes ago · auto-upload on"
                        : "Last push 6 days ago · auto-upload off"}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const rest = devices.filter((x) => x !== d);
                        setDevices(rest);
                        announce(`Disconnected ${d.split(" · ")[0]}. Its token no longer works.`);
                        if (rest.length === 0) onStep("none");
                      }}
                    >
                      Disconnect
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
            <div>
              <Button variant="secondary" onClick={() => onStep("code")}>
                Connect another computer
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

/* Settings */

function SettingsScreen({ name, onName }: { name: string; onName: (name: string) => void }) {
  const { announce } = useProto();
  const later = useLater();
  const nameId = useId();
  const tzId = useId();
  const mailId = useId();
  const [draft, setDraft] = useState(name);
  const [tz, setTz] = useState("Asia/Karachi");
  const [mail, setMail] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirming, setConfirming] = useState(false);
  const common = useCommonState("your settings", <SessionListLoading rows={3} />);
  const header = <AppPageHeader title="Settings" />;
  if (common)
    return (
      <>
        {header}
        {common}
      </>
    );
  return (
    <>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={nameId}>Name</FieldLabel>
              <Input id={nameId} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <FieldDescription>The CLI and the report greet you with this.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={tzId}>Time zone</FieldLabel>
              <Input id={tzId} value={tz} onChange={(e) => setTz(e.target.value)} />
            </Field>
            <Field orientation="horizontal">
              <Switch id={mailId} checked={mail} onCheckedChange={setMail} />
              <FieldLabel htmlFor={mailId}>Daily review email at 6 pm</FieldLabel>
            </Field>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            disabled={saving === "saving" || !draft.trim()}
            onClick={() => {
              setSaving("saving");
              later(() => {
                onName(draft.trim());
                setSaving("saved");
                announce("Settings saved.");
                later(() => setSaving("idle"), 1800);
              }, 600);
            }}
          >
            {saving === "saving" ? "Saving" : saving === "saved" ? "Saved" : "Save"}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            {confirming
              ? "Delete your sessions, cards, answers and logs? This can't be undone."
              : "Removes your sessions, cards, answers and logs."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          {confirming ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  announce("Prototype: nothing was deleted.");
                }}
              >
                Yes, delete everything
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep my account
              </Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              Delete account
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
