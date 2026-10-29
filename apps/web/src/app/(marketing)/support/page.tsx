import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";

import { Faq } from "@/components/marketing/faq";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Answers come only from docs/ARCHITECTURE.md and docs/plans/pages-and-dashboard.md.

export const metadata: Metadata = {
  title: "Support | Session Coach",
  description: "Answers about uploads, secrets, decision cards and scoring, and how to reach us.",
};

// Inlined at build time, so the page stays static. The fallback is a reserved example address that reaches no one:
// set NEXT_PUBLIC_SUPPORT_EMAIL to the real inbox before launch.
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

const faq = [
  {
    question: "What does Session Coach send from my laptop?",
    answer:
      "When a Claude Code session ends, a hook sends that session's log. We try to remove secrets on your laptop before anything leaves it.",
  },
  {
    question: "Are my secrets stored?",
    answer:
      "We try not to. Secrets are removed on your laptop before the log is sent, and again on the server before it is stored, but removal is not a guarantee: check what your sessions contain.",
  },
  {
    question: "What happens if I'm offline when a session ends?",
    answer:
      "The upload is retried up to 3 times. If it still fails, the log is kept in an outbox on your laptop. A session that was already sent is not taken twice.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your sessions, cards and answers are stored in Supabase, in the ap-south-1 region. The privacy policy says who processes them.",
  },
  {
    question: "What's the difference between a stated and an inferred card?",
    answer:
      "A stated card quotes the reason your agent gave. An inferred card is the model's guess at a reason the agent never wrote down, and it is labelled as one.",
  },
  {
    question: "Why is a card flagged, or missing?",
    answer:
      "Plain code checks every quote against the session. A card with a quote that couldn't be verified is flagged; a card with no matching quote is hidden from you.",
  },
  {
    question: "How are my answers scored?",
    answer:
      "Each answer gets 0, 1 or 2 against the card's reason, its quotes and a model answer. A 2 moves the card to the next review (day 1, 3, then 7); a 0 or 1 starts it again at day 1. Passing day 7 masters the card.",
  },
] as const;

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-16 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-20">
      <MarketingPageHeader title="Support">
        Common questions about Session Coach, and how to reach us.
      </MarketingPageHeader>

      <section aria-labelledby="faq-title" className="flex flex-col gap-6">
        <h2 id="faq-title" className="font-display text-4xl leading-tight text-text-1">
          Questions
        </h2>
        <Faq entries={faq} />
      </section>

      <section aria-labelledby="contact-title" className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="contact-title" className="flex items-center gap-3">
                <EnvelopeSimpleIcon weight="duotone" className="size-5" aria-hidden />
                Contact
              </h2>
            </CardTitle>
            <CardDescription>
              Email{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="text-text-1 underline underline-offset-4"
              >
                {supportEmail}
              </a>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
