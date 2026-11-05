import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";

import { Faq } from "@/components/marketing/faq";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportEmail } from "@/lib/site";

// Every answer must match the code and docs/CODEBASE.md.

export const metadata: Metadata = {
  title: "Support | Session Coach",
  description: "Answers about uploads, secrets, decision cards and scoring, and how to reach us.",
};

const faq = [
  {
    question: "What does Session Coach send from my laptop?",
    answer:
      "Only the session logs you send. session-coach push sends one, and the opt-in SessionStart hook runs session-coach sync to send your finished sessions. We try to remove secrets on your laptop before anything leaves it.",
  },
  {
    question: "Are my secrets stored?",
    answer:
      "We try not to. Secrets are removed on your laptop before the log is sent, and again on the server before it is stored, but removal is not a guarantee: check what your sessions contain.",
  },
  {
    question: "What happens if I'm offline?",
    answer:
      "The hook sends nothing and tries again the next time a session starts. What went wrong is written to ~/.session-coach/sync.log. A session that was already sent is not taken twice.",
  },
  {
    question: "A session failed. What now?",
    answer:
      "Open the session on your dashboard to see why. To send it again, run session-coach push with the session's log file.",
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
      "Each answer gets 0, 1 or 2 against the card's reason, its quotes and a model answer. A 2 moves the card to its next review (day 1, then day 4, then day 11); a 0 or 1 moves it one step down (never below day 1) and it comes back tomorrow. Passing the last review masters the card. “I don't know yet” scores 0 but keeps the card where it is.",
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
