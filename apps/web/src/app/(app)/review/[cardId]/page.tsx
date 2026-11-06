import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { CardTransition } from "@/components/review/card-transition";
import { SAMPLE_QUIZ_CARD } from "@/components/review/review-sample";
import { QuizView } from "@/components/review/review-views";
import { getCurrentUser } from "@/lib/auth/current-user";
import { answerRequestSchema } from "@/lib/review/grade";
import { getQuizCard, reviewQueue } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Explain it back" };

// No generateStaticParams: card ids are per learner, so params are runtime data and are read inside Suspense. The
// layout's breadcrumb reads usePathname(), which can't prerender without a param, so the route blocks instead.
export const instant = false;

export default function QuizPage({ params }: PageProps<"/review/[cardId]">) {
  return (
    <CardTransition>
      <Container>
        {/* Skullet measures the real quiz, drawn from a sample card, so nothing moves when the card lands. */}
        <MeasuredSuspense
          label="Loading the card"
          skeleton={<QuizView card={SAMPLE_QUIZ_CARD} nextHref={null} />}
        >
          <Quiz params={params} />
        </MeasuredSuspense>
      </Container>
    </CardTransition>
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

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then both queries. */
async function load(userId: string, cardId: string) {
  return Promise.all([getQuizCard(userId, cardId), reviewQueue(userId, new Date())]);
}
