import {
  ArrowsClockwiseIcon,
  CardsIcon,
  EyeSlashIcon,
  FlagIcon,
  LightbulbIcon,
  QuotesIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Every claim here must match the code and docs/CODEBASE.md; anything they don't say is a TODO(zia).
// A server page: Tabs and CodeBlock are client components, but every prop passed to them is plain data or markup,
// so only the tab switching runs in the browser.

export const metadata: Metadata = {
  title: "How it works | Session Coach",
  description:
    "How a Claude Code session becomes up to 5 decision cards: signing in, the upload, extraction, the evidence check and review on day 1, 4 and 11.",
};

// What the CLI prints, from packages/cli/src/cli.ts and push.ts. The code, address and file name are examples.
const terminal = [
  "$ npx session-coach login",
  "Your code: WDJB-MJHT",
  "Waiting for you to approve in the browser... (Ctrl+C to cancel)",
  "Signed in as you@example.com.",
  "$ npx session-coach push --latest",
  "Pushing 3f2a9c1e.jsonl (1.4 MB)",
  "Uploaded. Cards will appear in the app.",
].join("\n");

// Each step is a heading and at most two sentences.
const laptop = [
  {
    title: "Sign in from your terminal",
    body: "Run session-coach login and approve this device in your browser. The setup page gives you one prompt that installs the CLI, signs you in and sends your first session.",
  },
  {
    title: "The upload",
    body: "After session-coach init, each Claude Code session in that project is sent when it ends; session-coach push --latest sends one by hand. The CLI removes the secrets it recognises, compresses the log and uploads it, and refuses logs over 50 MB.",
  },
] as const;

const server = [
  {
    title: "Extraction",
    body: "The server keeps your prompts, the agent's text, file edit summaries and shell commands, and removes the secrets it recognises again. One model call turns that into up to 5 decision cards, or none when no decision is clear.",
  },
  {
    title: "The evidence check",
    body: "Each card quotes events from the session. Plain code, not a model, checks that each cited event exists, contains the quote, and that the quote is at least 5 words.",
  },
  {
    title: "What is stored",
    body: "The log with secrets removed, its decision cards, and your answers and scores, in Supabase in the ap-south-1 region. Secret removal can miss some, so check what your sessions contain.",
  },
] as const;

const review = [
  {
    title: "Answer first",
    body: "Each card asks why your agent made a decision, and you answer in your own words. The card's reason and its quotes show only after you answer.",
  },
  {
    title: "The score",
    body: "A model scores the answer 0, 1 or 2 (missed, partly, explained) against the card's reason, its quotes and a model answer. It tells you what was missing.",
  },
  {
    title: "The schedule",
    body: "A 2 moves the card on to day 1, then 4, then 11; a 0 or 1 moves it one step down and it comes back tomorrow. At most 5 cards a day, up to 2 of them new, and a daily email says when cards are due.",
  },
] as const;

const cardKinds = [
  {
    icon: QuotesIcon,
    title: "Stated",
    body: "The card quotes the reason your agent gave in the session.",
    badge: { variant: "outline" },
  },
  {
    icon: LightbulbIcon,
    title: "Inferred",
    body: "The agent never wrote a reason down, so the card holds the model's guess, and it is labelled as one.",
    badge: { variant: "outline" },
  },
  {
    icon: FlagIcon,
    title: "Flagged",
    body: "One of the card's quotes couldn't be verified against the session. You still see the card, with a label that says so.",
    badge: { status: "warn" },
  },
  {
    icon: EyeSlashIcon,
    title: "Hidden",
    body: "No quote on the card matches the session. The card is hidden from you.",
    badge: { variant: "ghost" },
  },
] as const;

// lib/review/schedule.ts: a new card is due 1 day after the session, then 3 and 7 days after each 2.
const stops = [
  { label: "Day 1", gap: "1 day after the session" },
  { label: "Day 4", gap: "3 days after a 2" },
  { label: "Day 11", gap: "7 days after a 2" },
  { label: "Owned", gap: "a 2 on day 11" },
] as const;

function Notes({ notes }: { notes: readonly { title: string; body: string }[] }) {
  return (
    <div className="flex flex-col gap-5">
      {notes.map(({ title, body }) => (
        <div key={title} className="flex flex-col gap-1 border-s-2 border-accent-line ps-3">
          <h3 className="type-label text-text-1">{title}</h3>
          <p className="type-body-sm text-text-2">{body}</p>
        </div>
      ))}
    </div>
  );
}

const panel = "grid gap-8 pt-8 md:grid-cols-2 md:gap-12";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-24">
      <MarketingPageHeader title="How it works">
        Three places, in order. Pick one to see what happens there.
      </MarketingPageHeader>

      <Reveal>
        <Tabs defaultValue="laptop">
          <TabsList>
            <TabsTrigger value="laptop">
              <TerminalWindowIcon aria-hidden />
              <span className="sm:hidden">Laptop</span>
              <span className="hidden sm:inline">On your laptop</span>
            </TabsTrigger>
            <TabsTrigger value="server">
              <CardsIcon aria-hidden />
              <span className="sm:hidden">Server</span>
              <span className="hidden sm:inline">On our server</span>
            </TabsTrigger>
            <TabsTrigger value="review">
              <ArrowsClockwiseIcon aria-hidden />
              <span className="sm:hidden">Review</span>
              <span className="hidden sm:inline">In your review</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="laptop">
            <div className={panel}>
              <Notes notes={laptop} />
              <CodeBlock variant="command" code={terminal} copyLabel="Copy the commands" />
            </div>
          </TabsContent>

          <TabsContent value="server">
            <div className={panel}>
              <div className="flex flex-col gap-5">
                <Notes notes={server} />
                <p className="type-body-sm text-text-2">
                  The{" "}
                  <Link href="/privacy" className="text-text-1 underline underline-offset-4">
                    privacy policy
                  </Link>{" "}
                  says who processes your data and how to delete it.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="type-label text-text-1">What a card can be</h3>
                <p className="type-body-sm text-text-2">
                  A card names a decision your agent made, why it made it, the quotes from the
                  session that show it, the files it touched and one question for you.
                </p>
                <ItemGroup>
                  {cardKinds.map(({ icon: KindIcon, title, body, badge }) => (
                    <Item key={title} size="sm">
                      <ItemMedia variant="icon">
                        <KindIcon aria-hidden />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          <Badge {...badge}>{title}</Badge>
                        </ItemTitle>
                        <ItemDescription>{body}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="review">
            <div className={panel}>
              <div className="flex flex-col gap-8">
                <Notes notes={review} />
                <ol
                  aria-label="When a card comes back"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  {stops.map(({ label, gap }) => (
                    <li key={label} className="flex flex-col gap-1 border-t-2 border-line-row pt-3">
                      <span className="type-label text-text-1">{label}</span>
                      <span className="type-body-sm text-text-2">{gap}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="type-label text-text-1">Your progress, by project</h3>
                {/* The dashboard's meter with example numbers: the bar fills with explained cards, as there. */}
                <Progress value={30}>
                  <ProgressLabel>your-project</ProgressLabel>
                  <span className="ms-auto type-label-sm text-text-2">
                    Explained 9 · owned 2 of 30
                  </span>
                </Progress>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="type-label text-text-1">Explained</dt>
                    <dd className="type-body-sm text-text-2">
                      You scored 2 on the card at least once. You can then defend it, if you want: a
                      timed answer and one follow-up question.
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="type-label text-text-1">Owned</dt>
                    <dd className="type-body-sm text-text-2">
                      You scored 2 on its last review, day 11. The card is mastered and stops coming
                      back.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Reveal>

      <Reveal className="flex flex-wrap items-center gap-3">
        <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
          <TerminalWindowIcon weight="duotone" data-icon="inline-start" aria-hidden />
          Get started
        </Link>
        <Link href="/support" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          Questions
        </Link>
      </Reveal>
    </div>
  );
}
