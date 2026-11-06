import { EyeSlashIcon, FlagIcon, LightbulbIcon, QuotesIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { HowItWorksSteps } from "@/components/marketing/how-it-works-steps";
import { ClosingSection } from "@/components/marketing/landing-sections";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel } from "@/components/ui/progress";

// Every claim here must match the code and docs/CODEBASE.md; anything they don't say is a TODO(zia).

export const metadata: Metadata = {
  title: "How it works | Session Coach",
  description:
    "How a Claude Code session becomes up to 5 decision cards: signing in, the upload, extraction, the evidence check and review on day 1, 4 and 11.",
};

const section =
  "mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) sm:px-(--gutter)";

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
    body: "The agent never wrote a reason down, so the card holds the model's guess, labelled as one.",
    badge: { variant: "outline" },
  },
  {
    icon: FlagIcon,
    title: "Flagged",
    body: "One of its quotes couldn't be verified. You still see the card, with a label that says so.",
    badge: { status: "warn" },
  },
  {
    icon: EyeSlashIcon,
    title: "Hidden",
    body: "No quote on the card matches the session, so the card is hidden from you.",
    badge: { variant: "ghost" },
  },
] as const;

function Heading({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="flex max-w-160 flex-col gap-3">
      <h2 id={id} className="type-heading-lg text-balance text-text-1 sm:type-display">
        {title}
      </h2>
      <p className="type-body-lg text-pretty text-text-2">{lead}</p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-24 overflow-x-clip pt-16 sm:gap-32 sm:pt-24">
      <div className={section}>
        <MarketingPageHeader title="How it works">
          From a Claude Code session to decisions you can explain, in six steps.
        </MarketingPageHeader>
        <HowItWorksSteps />
        <p className="max-w-160 type-body-sm text-text-2">
          We store the log with secrets removed, its cards, and your answers and scores, in Supabase
          in the ap-south-1 region. Secret removal can miss some, so check what your sessions
          contain. The{" "}
          <Link href="/privacy" className="text-text-1 underline underline-offset-4">
            privacy policy
          </Link>{" "}
          says who processes your data and how to delete it.
        </p>
      </div>

      <section aria-labelledby="kinds-title">
        <Reveal className={section}>
          <Heading
            id="kinds-title"
            title="What a card can be"
            lead="A decision your agent made, why, the quotes that show it, the files it touched and one question for you."
          />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cardKinds.map(({ icon: KindIcon, title, body, badge }) => (
              <li key={title} className="frame flex flex-col gap-4 bg-page p-6">
                <span className="flex items-center gap-2 text-text-2">
                  <KindIcon aria-hidden />
                  <Badge {...badge}>{title}</Badge>
                </span>
                <p className="type-body text-pretty text-text-2">{body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section aria-labelledby="progress-title">
        <Reveal className={section}>
          <Heading
            id="progress-title"
            title="Your progress, by project"
            lead="The dashboard fills one bar per project as you explain its cards."
          />
          <div className="grid gap-2 lg:grid-cols-3">
            <div className="frame flex flex-col justify-center gap-4 bg-page p-6">
              {/* The dashboard's meter with example numbers: the bar fills with explained cards, as there. */}
              <Progress value={30}>
                <ProgressLabel>your-project</ProgressLabel>
                <span className="ms-auto type-label-sm text-text-2">
                  Explained 9 · owned 2 of 30
                </span>
              </Progress>
            </div>
            <div className="frame flex flex-col items-start gap-2 bg-page p-6">
              <Badge variant="success">Explained</Badge>
              <p className="type-body text-pretty text-text-2">
                You scored 2 on the card at least once. You can then defend it if you want: a timed
                answer and one follow-up question.
              </p>
            </div>
            <div className="frame flex flex-col items-start gap-2 bg-page p-6">
              <Badge variant="success">Owned</Badge>
              <p className="type-body text-pretty text-text-2">
                You scored 2 on its last review, day 11. The card is mastered and stops coming back.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <ClosingSection />
    </div>
  );
}
