import {
  ArrowsClockwiseIcon,
  CardsIcon,
  ChatTextIcon,
  CloudArrowUpIcon,
  EyeSlashIcon,
  FlagIcon,
  LightbulbIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  QuotesIcon,
  TerminalWindowIcon,
  TrayIcon,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { FeatureCard } from "@/components/marketing/feature-card";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Facts only from docs/ARCHITECTURE.md and docs/plans/pages-and-dashboard.md; anything they don't say is a TODO(zia).

export const metadata: Metadata = {
  title: "How it works | Session Coach",
  description:
    "How a Claude Code session becomes 3 to 5 decision cards: the hook, the upload, extraction, the evidence check and review on day 1, 3 and 7.",
};

const pipeline = [
  {
    icon: TerminalWindowIcon,
    title: "The hook",
    body: "When a Claude Code session ends, a SessionEnd hook starts a small background worker and exits. The worker removes secrets from the session's log on your laptop, then compresses it.",
  },
  {
    icon: CloudArrowUpIcon,
    title: "The upload",
    body: "The worker sends the log to the server, retrying up to 3 times. If it still can't, it keeps the log in an outbox on your laptop. A session that was already sent is not taken twice.",
  },
  {
    icon: CardsIcon,
    title: "Extraction",
    body: "The server keeps your prompts, the agent's text, file edit summaries and shell commands, drops thinking blocks and attachments, and removes secrets again. One model call turns what is left into 3 to 5 decision cards.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "The evidence check",
    body: "Each card quotes events from the session. Plain code, not a model, checks that each cited event exists and contains the quote.",
  },
  {
    icon: ArrowsClockwiseIcon,
    title: "Review",
    body: "The cards appear on your dashboard when they are ready. You explain each decision back in your own words on day 1, 3 and 7, and a daily email tells you when cards are due.",
  },
] as const;

const storage = [
  {
    icon: TrayIcon,
    title: "What is stored",
    body: "The session's log with secrets removed, the decision cards made from it, and your answers and scores. It lives in Supabase, in the ap-south-1 region.",
  },
  {
    icon: LockKeyIcon,
    title: "What is never stored",
    body: "Secrets. They are removed on your laptop before the log is sent, and again on the server before it is stored.",
  },
] as const;

const cardKinds = [
  {
    icon: QuotesIcon,
    title: "Stated",
    body: "The card quotes the reason your agent gave in the session.",
  },
  {
    icon: LightbulbIcon,
    title: "Inferred",
    body: "The agent never wrote a reason down, so the card holds the model's guess, and it is labelled as one.",
  },
  {
    icon: FlagIcon,
    title: "Flagged",
    body: "One of the card's quotes couldn't be verified against the session. You still see the card, with a label that says so.",
  },
  {
    icon: EyeSlashIcon,
    title: "Hidden",
    body: "No quote on the card matches the session. The card is hidden from you.",
  },
] as const;

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-display text-4xl leading-tight text-balance text-text-1">
      {children}
    </h2>
  );
}

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-20 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-20">
      <MarketingPageHeader title="How it works">
        Each Claude Code session you finish becomes 3 to 5 decision cards. You explain them back on
        day 1, 3 and 7 until each one is mastered.
      </MarketingPageHeader>

      <section aria-labelledby="pipeline-title" className="flex flex-col gap-8">
        <SectionTitle id="pipeline-title">From session to cards</SectionTitle>
        <ol className="flex flex-col gap-4">
          {/* Not a FeatureCard: the step number sits before the icon. */}
          {pipeline.map(({ icon: Icon, title, body }, index) => (
            <li key={title}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="flex items-center gap-3">
                      <span className="type-label text-text-3 tabular-nums">{index + 1}</span>
                      <Icon weight="duotone" className="size-5" aria-hidden />
                      <span>
                        <span className="sr-only">Step {index + 1}: </span>
                        {title}
                      </span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="max-w-3xl type-body text-text-2">{body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="storage-title" className="flex flex-col gap-8">
        <SectionTitle id="storage-title">What happens to your sessions</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {storage.map(({ icon, title, body }) => (
            <FeatureCard key={title} icon={icon} title={title}>
              <p className="type-body text-text-2">{body}</p>
            </FeatureCard>
          ))}
        </div>
        <p className="type-body text-text-2">
          The{" "}
          <Link href="/privacy" className="text-text-1 underline underline-offset-4">
            privacy policy
          </Link>{" "}
          says who processes your data and how to delete it.
        </p>
      </section>

      <section aria-labelledby="cards-title" className="flex flex-col gap-8">
        <SectionTitle id="cards-title">What a card can be</SectionTitle>
        <p className="max-w-2xl type-body text-text-2">
          A card names a decision your agent made, why it made it, the quotes from the session that
          show it, the files it touched and one question for you.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {cardKinds.map(({ icon, title, body }) => (
            <FeatureCard key={title} icon={icon} title={title}>
              <p className="type-body text-text-2">{body}</p>
            </FeatureCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="review-title" className="flex flex-col gap-8">
        <SectionTitle id="review-title">The review</SectionTitle>
        <FeatureCard size="lg" icon={ChatTextIcon} title="Explain it back on day 1, 3 and 7">
          <ul className="flex max-w-3xl list-disc flex-col gap-3 ps-5 type-body text-text-2">
            <li>
              You answer each card&apos;s question in your own words. A model scores the answer 0, 1
              or 2 against the card&apos;s reason, its quotes and a model answer, and tells you what
              was missing.
            </li>
            <li>
              A 2 moves the card to the next gap: day 1, then day 3, then day 7. A 0 or 1 starts it
              again at day 1.
            </li>
            <li>Passing day 7 marks the card mastered, and it stops coming back.</li>
            <li>
              Your progress counts the decisions you can still explain: mastered cards plus cards
              you scored 2 on in the last 7 days.
            </li>
          </ul>
        </FeatureCard>
      </section>
    </div>
  );
}
