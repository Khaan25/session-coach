"use client";

// /review and /review/[cardId] on the canvas: the real views (components/review/review-views.tsx and quiz-form.tsx)
// that the pages render, fed the synthetic rows in review-sample.ts. Option B was dropped for the plain pages (#76).
// A step mid-way (scoring, a result) is QuizHeader over QuizAnswer or QuizResult, the parts QuizForm switches between.

import { Container } from "@/components/app/container";
import { QuizAnswer, QuizResult, QuizSendContext } from "@/components/review/quiz-form";
import {
  SAMPLE_GRADES,
  SAMPLE_QUIZ_CARD,
  SAMPLE_REVIEW_QUEUE,
} from "@/components/review/review-sample";
import { QueueList, QuizHeader, QuizView, ReviewHeader } from "@/components/review/review-views";

import { AppFrame } from "../frames";
import { CanvasToast } from "../map/parts";
import { canvasSend } from "./session";

const CARD_PATH = `/review/${SAMPLE_QUIZ_CARD.id}`;
const NEXT = `/review/${SAMPLE_REVIEW_QUEUE[1]!.id}`;

/** /review with today's queue. `children` replaces the queue with an empty or error state. */
export function CanvasReviewQueue({ children }: { children?: React.ReactNode }) {
  return (
    <AppFrame path="/review" dueCount={children ? 0 : SAMPLE_REVIEW_QUEUE.length}>
      <Container>
        <ReviewHeader />
        {children ?? <QueueList queue={SAMPLE_REVIEW_QUEUE} />}
      </Container>
    </AppFrame>
  );
}

/** /review/[cardId], live: type an answer and submit; the canvas grades it without the API. */
export function CanvasQuiz() {
  return (
    <AppFrame path={CARD_PATH} crumb="Review">
      <Container>
        <QuizSendContext value={canvasSend}>
          <QuizView card={SAMPLE_QUIZ_CARD} nextHref={NEXT} />
        </QuizSendContext>
      </Container>
    </AppFrame>
  );
}

/** The answer box held still: after a blocked paste, while scoring, or with the route's error under it. */
export function CanvasQuizAnswer({
  answer = "",
  error = null,
  pending = null,
  toast,
}: {
  answer?: string;
  error?: string | null;
  pending?: "answer" | "skip" | null;
  /** The toast QuizForm raises at this step. */
  toast?: { title: string; description?: string };
}) {
  return (
    <AppFrame
      path={CARD_PATH}
      crumb="Review"
      overlay={toast && <CanvasToast title={toast.title} description={toast.description} />}
    >
      <Container>
        <QuizHeader card={SAMPLE_QUIZ_CARD} />
        <QuizAnswer
          question={SAMPLE_QUIZ_CARD.question}
          answer={answer}
          error={error}
          pending={pending}
        />
      </Container>
    </AppFrame>
  );
}

/** The result QuizForm shows once the route answers: a score, or the why after "I don't know yet". */
export function CanvasQuizResult({
  score = 2,
  skipped = false,
  last = false,
}: {
  score?: 0 | 1 | 2;
  skipped?: boolean;
  /** The last card in today's queue: no Next card. */
  last?: boolean;
}) {
  return (
    <AppFrame path={CARD_PATH} crumb="Review">
      <Container>
        <QuizHeader card={SAMPLE_QUIZ_CARD} />
        <QuizResult
          grade={skipped ? { ...SAMPLE_GRADES[2], nextDue: "2026-11-04" } : SAMPLE_GRADES[score]}
          answer="The token is one learner. An office shares one IP, so an IP limit blocks the whole office."
          skipped={skipped}
          nextHref={last ? null : NEXT}
        />
      </Container>
    </AppFrame>
  );
}
