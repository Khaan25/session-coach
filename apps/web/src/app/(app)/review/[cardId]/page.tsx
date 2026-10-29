import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { ReviewCardLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { QuizForm } from "@/components/review/quiz-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { answerRequestSchema } from "@/lib/review/grade";
import { getQuizCard, reviewQueue } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Explain it back" };

// No generateStaticParams: card ids are per learner, so params are runtime data and are read inside Suspense. The
// layout's breadcrumb reads usePathname(), which can't prerender without a param, so the route blocks instead.
export const instant = false;

export default function QuizPage({ params }: PageProps<"/review/[cardId]">) {
  return (
    <Container>
      <Suspense fallback={<ReviewCardLoading />}>
        <Quiz params={params} />
      </Suspense>
    </Container>
  );
}

async function Quiz({ params }: Pick<PageProps<"/review/[cardId]">, "params">) {
  const { cardId } = await params;
  if (!answerRequestSchema.shape.cardId.safeParse(cardId).success) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const [card, queue] = await load(user.id, cardId);
  if (!card) notFound();
  // "Start review" walks the queue: after this card, the first other card still in it.
  const next = queue.find(({ id }) => id !== card.id);

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
        nextHref={next ? `/review/${next.id}` : null}
      />
    </>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then both queries. */
async function load(userId: string, cardId: string) {
  return Promise.all([getQuizCard(userId, cardId), reviewQueue(userId, new Date())]);
}
