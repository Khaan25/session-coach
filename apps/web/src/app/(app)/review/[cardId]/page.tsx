import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { QuizForm } from "@/components/review/quiz-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { answerRequestSchema } from "@/lib/review/grade";
import { getQuizCard, reviewQueue, type QuizCard } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Explain it back" };

// No generateStaticParams: card ids are per learner, so params are runtime data and are read inside Suspense. The
// layout's breadcrumb reads usePathname(), which can't prerender without a param, so the route blocks instead.
export const instant = false;

// Only the skeleton's shape comes from this: a decision that fits one display line on a laptop, as most do.
const SAMPLE_CARD: QuizCard = {
  id: "sample-card",
  decision: "Rate limit uploads per token, not per IP",
  question: "Why is the limit keyed on the token rather than the IP?",
  sessionId: "sample-session",
  sessionName: "Add rate limiting to the upload route",
  level: 2,
};

export default function QuizPage({ params }: PageProps<"/review/[cardId]">) {
  return (
    <Container>
      {/* Skullet measures the real quiz, drawn from a sample card, so nothing moves when the card lands. */}
      <MeasuredSuspense
        label="Loading the card"
        skeleton={<QuizView card={SAMPLE_CARD} nextHref={null} />}
      >
        <Quiz params={params} />
      </MeasuredSuspense>
    </Container>
  );
}

async function Quiz({ params }: Pick<PageProps<"/review/[cardId]">, "params">) {
  const [{ cardId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!answerRequestSchema.shape.cardId.safeParse(cardId).success) notFound();
  if (!user) notFound();
  const [card, queue] = await load(user.id, cardId);
  if (!card) notFound();
  // "Start review" walks the queue: after this card, the first other card still in it.
  const next = queue.find(({ id }) => id !== card.id);
  return <QuizView card={card} nextHref={next ? `/review/${next.id}` : null} />;
}

function QuizView({ card, nextHref }: { card: QuizCard; nextHref: string | null }) {
  return (
    <>
      <AppPageHeader
        title={card.decision}
        description={
          <>
            From{" "}
            <Link href={`/s/${card.sessionId}`} className={buttonVariants({ variant: "link" })}>
              {card.sessionName}
            </Link>
          </>
        }
      />
      <QuizForm
        key={card.id}
        cardId={card.id}
        question={card.question}
        level={card.level}
        nextHref={nextHref}
      />
    </>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then both queries. */
async function load(userId: string, cardId: string) {
  return Promise.all([getQuizCard(userId, cardId), reviewQueue(userId, new Date())]);
}
