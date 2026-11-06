import Link from "next/link";
import { projectHref, type ProjectScope } from "@/lib/projects/scope";
import { LearningMark } from "@/components/art/engineering-illustrations";
import { QuizForm } from "@/components/review/quiz-form";
import { buttonVariants } from "@/components/ui/button";
import type { QueueCard, QuizCard } from "@/lib/review/queries";
export function ReviewHeader() {
  return (
    <header className="studio-page-heading">
      <p className="studio-eyebrow">FROM YOUR OWN WORK</p>
      <h1>A little practice. A clearer reason.</h1>
    </header>
  );
}
export function QueueList({ queue, scope = "all" }: { queue: QueueCard[]; scope?: ProjectScope }) {
  const first = queue[0];
  return (
    <section className="learning-queue">
      <div className="studio-section-bar">
        <h2>
          {queue.length} {queue.length === 1 ? "decision" : "decisions"} to review.
        </h2>
        {first && (
          <Link
            href={projectHref(`/review/${first.id}?step=1&total=${queue.length}`, scope)}
            className={buttonVariants()}
          >
            Start review
          </Link>
        )}
      </div>
      <ol>
        {queue.map((card, i) => (
          <li key={card.id}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <Link href={projectHref(`/review/${card.id}`, scope)}>{card.decision}</Link>
              <p>
                {card.repo ?? card.sessionName} ·{" "}
                {card.step === 0
                  ? "First try"
                  : card.step === 1
                    ? "Day 1"
                    : card.step === 2
                      ? "Day 4"
                      : "Day 11"}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="learning-footnote">Up to five decisions a day, across all your projects.</p>
    </section>
  );
}
export function QuizHeader({ card }: { card: QuizCard }) {
  return (
    <header className="learning-review-intro">
      <span className="learning-section-caption">
        <LearningMark kind="explain" size="small" />
        Your own words
      </span>
      <h1>{card.decision}</h1>
    </header>
  );
}
export function QuizView({
  card,
  nextHref,
  step = 1,
  total = 1,
}: {
  card: QuizCard;
  nextHref: string | null;
  step?: number;
  total?: number;
}) {
  return (
    <div className="learning-review">
      <div className="learning-review-context">
        <Link href={`/s/${card.sessionId}`}>{card.repo ?? card.sessionName}</Link>
        <span>
          {step} of {total}
        </span>
      </div>
      <QuizHeader card={card} />
      <QuizForm key={card.id} cardId={card.id} question={card.question} nextHref={nextHref} />
    </div>
  );
}
