import sample from "@session-coach/shared/fixtures/session.sample.json";

import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";

// The loop on /how-it-works: six steps, each one or two sentences beside a small picture of the product, in the
// landing bento's visual language. Every claim must match the code and docs/CODEBASE.md; anything they don't say is a
// TODO(zia). The commands are lib/setup/ai-prompt.ts's; the output lines are what packages/cli prints. The code,
// address and file name are examples.

const login = [
  "$ npx session-coach@latest login",
  "Your code: WDJB-MJHT",
  "Signed in as you@example.com.",
].join("\n");

const upload = [
  "$ npx session-coach@latest init",
  "$ npx session-coach@latest push --latest",
  "Pushing 3f2a9c1e.jsonl (1.4 MB)",
  "Uploaded. Cards will appear in the app.",
].join("\n");

const quote = sample.cards[0].evidence[0].quote;

// lib/review/schedule.ts: a new card is due 1 day after the session, then 3 and 7 days after each 2.
const stops = [
  { label: "Day 1", gap: "after the session" },
  { label: "Day 4", gap: "3 days after a 2" },
  { label: "Day 11", gap: "7 days after a 2" },
] as const;

function EvidenceCheck() {
  return (
    <ul className="flex w-full max-w-sm flex-col gap-2">
      <li className="frame flex flex-col gap-2 bg-page p-4">
        <span className="type-body-sm text-text-1">&ldquo;{quote}&rdquo;</span>
        <span className="flex items-center justify-between type-label-sm text-text-3">
          Event {sample.cards[0].evidence[0].event_index}
          <Badge variant="success">Verified</Badge>
        </span>
      </li>
      <li className="frame flex flex-col gap-2 bg-page p-4">
        <span className="type-body-sm text-text-1">&ldquo;use gzip&rdquo;</span>
        <span className="flex items-center justify-between type-label-sm text-text-3">
          Under 5 words
          <Badge status="warn">Flagged</Badge>
        </span>
      </li>
    </ul>
  );
}

function ScoreChip() {
  return (
    <div className="frame flex w-full max-w-sm flex-col gap-3 bg-page p-4">
      <p className="type-label text-text-1">{sample.cards[0].question}</p>
      <p className="type-body-sm text-text-2">
        resultSchema.ts already imports modules that way, so the new parser stays consistent…
      </p>
      <span className="flex items-center justify-between type-label-sm text-text-3">
        Score
        <Badge variant="success">2 · Explained</Badge>
      </span>
    </div>
  );
}

function ReviewDays() {
  return (
    <ol aria-label="When a card comes back" className="grid w-full max-w-sm grid-cols-2 gap-2">
      {stops.map(({ label, gap }) => (
        <li key={label} className="frame flex flex-col items-start gap-2 bg-page p-3">
          <Badge variant="outline">{label}</Badge>
          <span className="type-body-sm text-text-2">{gap}</span>
        </li>
      ))}
      <li className="frame flex flex-col items-start gap-2 bg-page p-3">
        <Badge variant="success">Owned</Badge>
        <span className="type-body-sm text-text-2">a 2 on day 11</span>
      </li>
    </ol>
  );
}

// Each step is a heading and at most two sentences.
const steps = [
  {
    title: "Sign in from your terminal",
    body: "Run login and approve the code in your browser. The setup page gives you one prompt that installs the CLI, signs you in and sends your first session.",
    visual: (
      <CodeBlock
        variant="command"
        code={login}
        copyLabel="Copy the login command"
        className="w-full"
      />
    ),
  },
  {
    title: "Each session uploads when it ends",
    body: "After init, every Claude Code session in that project is sent when it ends; push --latest sends one by hand. The CLI removes the secrets it recognises, compresses the log and refuses logs over 50 MB.",
    visual: (
      <CodeBlock variant="command" code={upload} copyLabel="Copy the commands" className="w-full" />
    ),
  },
  {
    title: "Up to 5 decision cards",
    body: "The server keeps your prompts, the agent's text, file edit summaries and shell commands, and removes secrets again. One model call turns that into up to 5 decision cards, or none when no decision is clear.",
    visual: (
      <div className="w-full scale-90">
        <DecisionCardPreview />
      </div>
    ),
  },
  {
    title: "Every quote is checked",
    body: "Each card quotes events from the session. Plain code, not a model, checks that each cited event exists, contains the quote, and that the quote is at least 5 words.",
    visual: <EvidenceCheck />,
  },
  {
    title: "Answer first, then see the why",
    body: "You explain the decision in your own words before the card's reason and quotes show. A model scores it 0, 1 or 2 against them and a model answer, and says what was missing.",
    visual: <ScoreChip />,
  },
  {
    title: "Back on day 1, 4 and 11",
    body: "A 2 moves the card on; a 0 or 1 moves it one step down and it comes back tomorrow. At most 5 cards a day, up to 2 of them new, and a daily email says when cards are due.",
    visual: <ReviewDays />,
  },
] as const;

function Picture({ children }: { children: React.ReactNode }) {
  return (
    <div className="frame flex min-h-64 items-center justify-center overflow-clip bg-well p-4 sm:p-6">
      {children}
    </div>
  );
}

/**
 * The steps as a vertical timeline: numbers on a rule down the start edge, each step's text beside its picture from
 * lg and over it below. Chosen over alternating rows (the eye zigzags) and a sticky step list (the list repeats the
 * headings, and the page grows a quarter longer).
 */
export function HowItWorksSteps() {
  return (
    <ol className="flex flex-col">
      {steps.map(({ title, body, visual }, i) => (
        <li key={title} className="group flex gap-4 sm:gap-8">
          <div className="flex flex-col items-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-row type-label text-text-1 tabular-nums">
              {i + 1}
            </span>
            <span aria-hidden className="w-px flex-1 bg-line-row group-last:hidden" />
          </div>
          <Reveal className="grid min-w-0 flex-1 grid-cols-1 gap-6 pb-16 group-last:pb-0 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col gap-3 pt-1">
              <h3 className="type-heading text-balance text-text-1">{title}</h3>
              <p className="max-w-md type-body text-pretty text-text-2">{body}</p>
            </div>
            <Picture>{visual}</Picture>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
