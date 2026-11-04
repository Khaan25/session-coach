// Synthetic data for the clickable prototype. Nothing here is fetched: the prototype starts from these and keeps
// every change in React state, so a reload puts it back.

import { cards as sampleCards } from "@/components/design-system/sample";

import type { KeyIdea } from "./prototype-grade";

export type Repo = "session-coach" | "rapporteur";
export type ReviewDay = 1 | 4 | 11;

export type ProtoSession = {
  id: string;
  title: string;
  repo: Repo;
  branch: string;
  status: "ready" | "processing" | "failed";
  error: string | null;
  created_at: string;
  minutes: number;
  events: number;
};

export type ProtoCard = {
  id: string;
  sessionId: string;
  repo: Repo;
  decision: string;
  question: string;
  why: string;
  evidence: string;
  file: string;
  /** The review day this card is on. A right answer on day 11 makes it owned. */
  day: ReviewDay;
  /** Due today. Not-due cards still show on their session's page. */
  due: boolean;
  ideas: KeyIdea[];
};

export type OwnedDecision = {
  id: string;
  repo: Repo;
  decision: string;
  quote: string;
  question: string;
  followUp: string;
  defended: boolean;
};

const strip = (text: string) => {
  const plain = text.replace("SAMPLE: ", "");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
};

export const SESSIONS: ProtoSession[] = [
  {
    id: "s1",
    title: "Add rate limiting to the upload route",
    repo: "session-coach",
    branch: "main",
    status: "ready",
    error: null,
    created_at: "2026-11-02T18:10:00Z",
    minutes: 42,
    events: 412,
  },
  {
    id: "s2",
    title: "Write transcriptParser.ts",
    repo: "rapporteur",
    branch: "main",
    status: "ready",
    error: null,
    created_at: "2026-11-01T16:40:00Z",
    minutes: 38,
    events: 290,
  },
  {
    id: "s3",
    title: "Move email to Resend",
    repo: "session-coach",
    branch: "email",
    status: "failed",
    error: "The log was empty after redaction.",
    created_at: "2026-10-31T12:00:00Z",
    minutes: 6,
    events: 18,
  },
];

/** The session the setup flow "pushes": it arrives processing, then becomes ready with NEW_CARDS. */
export const FIRST_PUSH: ProtoSession = {
  id: "s4",
  title: "Add the device-code login",
  repo: "session-coach",
  branch: "cli-login",
  status: "processing",
  error: null,
  created_at: "2026-11-03T08:55:00Z",
  minutes: 27,
  events: 233,
};

export const CARDS: ProtoCard[] = [
  {
    id: "c1",
    sessionId: "s1",
    repo: "session-coach",
    decision: "Rate limit uploads per CLI token, not per IP",
    question: "Why key the upload limit on the CLI token instead of the IP address?",
    why: "A shared office or VPN IP would block every learner behind it. A token is one learner on one device.",
    evidence: "key it on the token so a shared office IP isn't blocked",
    file: "apps/web/src/app/api/upload/route.ts",
    day: 11,
    due: true,
    ideas: [
      {
        words: ["office", "shared", "vpn", "nat", "same ip", "everyone", "many"],
        missing: "Many learners can sit behind one office or VPN address.",
      },
      {
        words: ["token", "per person", "device", "one learner", "user"],
        missing: "The token stands for one learner on one device.",
      },
    ],
  },
  {
    id: "c2",
    sessionId: "s1",
    repo: "session-coach",
    decision: "Answer extra uploads with 429 and Retry-After, never queue them",
    question: "Why reject extra uploads with a 429 instead of queueing them on the server?",
    why: "The CLI already backs off and retries. Retry-After tells it when, and the server never holds a queue that grows under load.",
    evidence: "the CLI already backs off, so just tell it when",
    file: "apps/web/src/app/api/upload/route.ts",
    day: 4,
    due: true,
    ideas: [
      {
        words: ["retry", "retries", "back off", "backoff", "later"],
        missing: "The CLI already retries, and Retry-After tells it when.",
      },
      {
        words: ["queue", "memory", "pile", "grow", "load"],
        missing: "A queue on the server grows without limit under load.",
      },
    ],
  },
  {
    id: "c3",
    sessionId: "s1",
    repo: "session-coach",
    decision: "Count the limit in a sliding window, not per calendar minute",
    question: "Why a sliding window instead of resetting the count every minute?",
    why: "A fixed minute lets a burst at 0:59 and another at 1:00 through, double the limit.",
    evidence: "a fixed window lets 2x through at the boundary",
    file: "apps/web/src/lib/rate-limit.ts",
    day: 1,
    due: true,
    ideas: [
      {
        words: ["burst", "boundary", "edge", "double", "twice", "2x"],
        missing: "A fixed minute lets a burst through on both sides of the boundary.",
      },
      {
        words: ["smooth", "even", "rolling", "last 60", "sliding"],
        missing: "The window always counts the last 60 seconds, so the rate stays even.",
      },
    ],
  },
  {
    id: "c4",
    sessionId: "s1",
    repo: "session-coach",
    decision: "Keep the limiter's counts in Postgres, not in memory",
    question: "Why keep the limiter's counts in Postgres instead of the server's memory?",
    why: "Serverless instances don't share memory, so each one would keep its own count and the limit would leak.",
    evidence: "each function instance has its own memory",
    file: "apps/web/src/lib/rate-limit.ts",
    day: 11,
    due: true,
    ideas: [
      {
        words: ["serverless", "instance", "lambda", "function", "cold start"],
        missing: "Each serverless instance has its own memory.",
      },
      {
        words: ["share", "shared", "reset", "lost", "leak", "own count"],
        missing: "A count in memory isn't shared, so the limit leaks.",
      },
    ],
  },
  {
    id: "c5",
    sessionId: "s2",
    repo: "rapporteur",
    decision: sampleCards[0].decision,
    question: sampleCards[0].question,
    why: sampleCards[0].why,
    evidence: sampleCards[0].evidence[0].quote,
    file: sampleCards[0].files[0],
    day: 11,
    due: true,
    ideas: [
      {
        words: ["convention", "resultschema", "consistent", "same as", "existing", "match"],
        missing: "It matches the convention already used in resultSchema.ts.",
      },
      {
        words: ["esm", "node", "resolve", "module", "extension"],
        missing: "Node's ESM resolver needs the extension written out.",
      },
    ],
  },
  {
    id: "c6",
    sessionId: "s2",
    repo: "rapporteur",
    decision: strip(sampleCards[1].decision),
    question: sampleCards[1].question,
    why: strip(sampleCards[1].why),
    evidence: sampleCards[1].evidence[0].quote,
    file: sampleCards[1].files[0],
    day: 4,
    due: true,
    ideas: [
      {
        words: ["skip", "ignore", "drop", "unknown"],
        missing: "Unknown line types are skipped, not thrown.",
      },
      {
        words: ["new type", "without notice", "whole session", "fail", "break", "changes"],
        missing:
          "Claude Code adds line types without notice, and one shouldn't fail the whole session.",
      },
    ],
  },
  {
    id: "c7",
    sessionId: "s2",
    repo: "rapporteur",
    decision: strip(sampleCards[2].decision),
    question: sampleCards[2].question,
    why: strip(sampleCards[2].why),
    evidence: sampleCards[2].evidence[0].quote,
    file: sampleCards[2].files[0],
    day: 1,
    due: false,
    ideas: [
      {
        words: ["short", "e2", "id", "cite", "filter"],
        missing: "The model cites short ids like E2 from the filtered list.",
      },
      {
        words: ["map", "raw", "original", "audit"],
        missing: "The map still opens the original raw line for auditing.",
      },
    ],
  },
];

/** The 3 cards FIRST_PUSH brings once it is ready. */
export const NEW_CARDS: ProtoCard[] = [
  {
    id: "c8",
    sessionId: "s4",
    repo: "session-coach",
    decision: "Log the CLI in with a device code, never a pasted token",
    question: "Why does the CLI show a code and open the browser instead of asking for a token?",
    why: "A pasted token ends up in shell history and chat logs. The code is useless after one use or 10 minutes.",
    evidence: "no token in the terminal or the agent's chat",
    file: "packages/cli/src/login.ts",
    day: 1,
    due: true,
    ideas: [
      {
        words: ["history", "log", "chat", "paste", "leak"],
        missing: "A pasted token leaks into shell history and chat logs.",
      },
      {
        words: ["expire", "once", "10 minutes", "one use", "short"],
        missing: "The code works once and expires after 10 minutes.",
      },
    ],
  },
  {
    id: "c9",
    sessionId: "s4",
    repo: "session-coach",
    decision: "Name each CLI token after its device",
    question: "Why does each CLI token carry the device's name?",
    why: "So the learner can see which computer pushed what and disconnect one without signing out the others.",
    evidence: "show 'MacBook Pro' in the devices list",
    file: "apps/web/src/app/api/cli/approve/route.ts",
    day: 1,
    due: true,
    ideas: [
      {
        words: ["which", "device", "computer", "see"],
        missing: "The learner sees which computer each token belongs to.",
      },
      {
        words: ["disconnect", "revoke", "one", "others"],
        missing: "One device can be disconnected without touching the others.",
      },
    ],
  },
  {
    id: "c10",
    sessionId: "s4",
    repo: "session-coach",
    decision: "Poll for approval every 5 seconds instead of holding a socket open",
    question: "Why does the CLI poll every 5 seconds rather than keep a connection open?",
    why: "Polling works through proxies and serverless timeouts, and 5 seconds is fast enough for a person clicking a button.",
    evidence: "serverless kills long requests anyway",
    file: "packages/cli/src/login.ts",
    day: 1,
    due: true,
    ideas: [
      {
        words: ["proxy", "timeout", "serverless", "firewall"],
        missing: "Long connections die on proxies and serverless timeouts.",
      },
      {
        words: ["fast enough", "person", "human", "click", "seconds"],
        missing: "5 seconds is quick enough for a person clicking approve.",
      },
    ],
  },
];

/** Owned before the prototype starts: 17 in all, the 5 named here plus 12 from older sessions. */
export const OWNED: OwnedDecision[] = [
  {
    id: "o1",
    repo: "session-coach",
    decision: "Store CLI tokens hashed, show them once",
    quote: "if the table leaks, the tokens don't work",
    question: "Why store only a hash of each CLI token, and show the token once?",
    followUp:
      "You said a leaked table wouldn't leak working tokens. The token can't be shown again, so what does a learner do when they lose it?",
    defended: false,
  },
  {
    id: "o2",
    repo: "session-coach",
    decision: "Keep the newest events when a session is too long",
    quote: "the end of a session is where the decisions land",
    question: "Why keep the newest events, not the oldest, when a session is over the limit?",
    followUp:
      "You said the end holds the decisions. What gets lost from the start, and how would a card show it?",
    defended: true,
  },
  {
    id: "o3",
    repo: "session-coach",
    decision: "Redact secrets on the device before upload",
    quote: "the server never sees a raw key",
    question: "Why redact secrets in the CLI instead of on the server after upload?",
    followUp:
      "You said the server never sees a raw key. What happens to a secret the redactor doesn't recognise?",
    defended: true,
  },
  {
    id: "o4",
    repo: "session-coach",
    decision: "Send the daily email at 6 pm learner time",
    quote: "after work, before the evening session",
    question: "Why send the review email at 6 pm in the learner's time zone?",
    followUp:
      "You said it lands after work. What should happen for a learner who never set a time zone?",
    defended: false,
  },
  {
    id: "o5",
    repo: "rapporteur",
    decision: "Parse JSONL line by line, not as one JSON array",
    quote: "one bad line shouldn't lose the whole log",
    question: "Why read the transcript line by line instead of as one JSON document?",
    followUp:
      "You said one bad line shouldn't lose the log. How does the parser report the line it skipped?",
    defended: false,
  },
];

/** Owned and total cards per repo before the prototype starts. */
export const METER: Record<Repo, { owned: number; total: number }> = {
  "session-coach": { owned: 12, total: 30 },
  rapporteur: { owned: 5, total: 9 },
};

/** Last 6 days, oldest first; today is added by the prototype. A missed day is grey and never resets anything. */
export const PAST_DAYS = [true, true, false, true, true, true];
export const DAY_NAMES = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Today"];

export const DAILY_CAP = 5;
export const DEVICE_CODE = "WDJB-MJHT";
