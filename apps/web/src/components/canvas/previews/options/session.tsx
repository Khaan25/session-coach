"use client";

// /s/[id] on the canvas: the real SessionView (components/sessions/session-view.tsx) that the page renders, fed the
// synthetic session in session-sample.ts. Option B was dropped for the plain page (#76), so this is the page itself.

import type { SessionStatus } from "@session-coach/shared/session";

import { SAMPLE_GRADES } from "@/components/review/review-sample";
import { QuizSendContext } from "@/components/review/quiz-form";
import {
  SAMPLE_SESSION,
  SAMPLE_SESSION_CARDS,
  SAMPLE_SESSION_NOW,
} from "@/components/sessions/session-sample";
import { SessionView } from "@/components/sessions/session-view";

import { AppFrame } from "../frames";

/** Grades an answer on the canvas without the API: a short wait, then the sample grade for a 2. */
export const canvasSend = () =>
  new Promise<(typeof SAMPLE_GRADES)[2]>((resolve) =>
    setTimeout(() => resolve(SAMPLE_GRADES[2]), 800),
  );

const FAILED_ERROR =
  "Making cards from this session didn't finish. Run session-coach push again to retry.";

export function CanvasSession({
  status,
  noCards,
  stuck,
}: {
  status: SessionStatus;
  /** A ready session whose extraction kept no card. */
  noCards?: boolean;
  /** A run that died: shown as failed, with Try again. */
  stuck?: boolean;
}) {
  return (
    <AppFrame path="/s/7f3a2c91">
      <QuizSendContext value={canvasSend}>
        <SessionView
          session={{
            ...SAMPLE_SESSION,
            status,
            error: status === "failed" ? FAILED_ERROR : null,
          }}
          cards={noCards ? [] : SAMPLE_SESSION_CARDS}
          now={SAMPLE_SESSION_NOW}
          stuck={stuck}
        />
      </QuizSendContext>
    </AppFrame>
  );
}
