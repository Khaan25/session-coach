import { parseProjectScope } from "@/lib/projects/scope";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { SAMPLE_QUIZ_CARD } from "@/components/review/review-sample";
import { QuizView } from "@/components/review/review-views";
import { getCurrentUser } from "@/lib/auth/current-user";
import { answerRequestSchema } from "@/lib/review/grade";
import { getQuizCard, reviewQueue } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Explain it back" };

// No generateStaticParams: card ids are per learner, so params are runtime data and are read inside Suspense. The
// layout's breadcrumb reads usePathname(), which can't prerender without a param, so the route blocks instead.
export const instant = false;

export default function QuizPage({ params, searchParams }: PageProps<"/review/[cardId]">) {
  return (
    <Container>
      {/* Skullet measures the real quiz, drawn from a sample card, so nothing moves when the card lands. */}
      <MeasuredSuspense
        label="Loading the card"
        skeleton={<QuizView card={SAMPLE_QUIZ_CARD} nextHref={null} />}
      >
        <Quiz params={params} searchParams={searchParams} />
      </MeasuredSuspense>
    </Container>
  );
}

async function Quiz({
  params,
  searchParams,
}: Pick<PageProps<"/review/[cardId]">, "params" | "searchParams">) {
  const [{ cardId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!answerRequestSchema.shape.cardId.safeParse(cardId).success) notFound();
  if (!user) notFound();
  const query = await searchParams;
  const scope = parseProjectScope(
    query.project ?? (typeof query.repo === "string" ? "repo:" + query.repo : null),
  );
  const [card, queue] = await load(user.id, cardId, scope);
  if (!card) notFound();
  // "Start review" walks the queue: after this card, the first other card still in it.
  const step = Math.min(5, Math.max(1, Number(query.step) || 1));
  const total = Math.min(5, Math.max(step, Number(query.total) || queue.length));
  const next = queue.find(({ id }) => id !== card.id);
  return (
    <QuizView
      card={card}
      step={step}
      total={total}
      nextHref={
        next
          ? `/review/${next.id}?step=${Math.min(5, step + 1)}&total=${total}${scope !== "all" ? "&project=" + encodeURIComponent(scope) : ""}`
          : null
      }
    />
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then both queries. */
async function load(userId: string, cardId: string, scope: ReturnType<typeof parseProjectScope>) {
  return Promise.all([getQuizCard(userId, cardId), reviewQueue(userId, new Date(), scope)]);
}
