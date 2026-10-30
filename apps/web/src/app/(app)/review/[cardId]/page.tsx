import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { QuizForm } from "@/components/review/quiz-form";
import { getQuizCard, quizCardIds, sampleGrade } from "@/lib/sample/cards";

export const metadata: Metadata = { title: "Explain it back" };

// Blocks on params so an unknown id still answers 404 before streaming. TODO(zia): revisit with the real query:
// a Suspense boundary around the data (with the loading skeleton) makes the navigation instant.
export const instant = false;

// cacheComponents needs at least one param to prerender; the sample's visible cards.
export function generateStaticParams() {
  return quizCardIds.map((cardId) => ({ cardId }));
}

export default async function QuizPage({ params }: PageProps<"/review/[cardId]">) {
  const { cardId } = await params;
  // TODO(zia): load the card with the learner's client and an explicit column list (decision, question); a hidden
  // card or another learner's returns no row.
  const card = getQuizCard(cardId);
  if (!card) notFound();

  return (
    <Container>
      <AppPageHeader
        title={card.decision}
        description={
          <>
            From{" "}
            <Link href={`/s/${card.sessionId}`} className={buttonVariants({ variant: "link" })}>
              {card.sessionTitle}
            </Link>
          </>
        }
      />
      <QuizForm key={card.id} question={card.question} sampleGrade={sampleGrade} />
    </Container>
  );
}
