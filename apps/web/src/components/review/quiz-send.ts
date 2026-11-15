import { createContext } from "react";

import type { Grade } from "@/components/review/quiz-form";

// How a quiz answer reaches the grader, apart from the quiz's components so /canvas can swap it.

export type Attempt = { answer: string } | { dontKnow: true };

export const PASTE_OFF = "Paste is off here. Type it in your own words.";

/** Sends an explanation, or `{ dontKnow: true }` for an honest skip. */
async function postAnswer(cardId: string, attempt: Attempt): Promise<Grade> {
  const response = await fetch("/api/review/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cardId, ...attempt }),
  }).catch(() => null);
  if (!response) {
    throw new Error("Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Try again.");
  }
  // The connection dropped mid-body: the server may have saved the answer already. A resend then gets the route's 409,
  // which says when the card is next due.
  if (!body) {
    throw new Error(
      "The result didn't arrive. Send it again: if it was saved, you'll see when this card is due next.",
    );
  }
  return body as Grade;
}

/**
 * How an answer reaches the grader: the route by default. /canvas provides a stand-in, so a quiz drawn there never
 * calls the API.
 */
export const QuizSendContext =
  createContext<(cardId: string, attempt: Attempt) => Promise<Grade>>(postAnswer);
