/**
 * POST /api/defend/start: opens a timed defense of one random card the learner has answered 2 at least once. Returns
 * { defenseId, question, decision, sessionName, repo, startedAt, answerDueAt, answerSeconds, serverNow }: the question,
 * the decision and its session, and the server's clock, never the answer key. A finished defense is labelled "defended (timed, follow-up)", never "verified".
 */
import { NextResponse } from "next/server";

import {
  ANSWER_SECONDS,
  deadlineOf,
  isLate,
  openWindow,
  pickCard,
  UNFINISHED,
} from "@/lib/defend/defend";
import { requireUser, serverError, UNIQUE_VIOLATION } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessionName } from "@/lib/sessions/name";

/**
 * Starts a defense. Learners can't write `defenses` (RLS), so this route inserts the row with the service role.
 *
 * - `getUser()` checks the session with the auth server, since this writes data.
 * - One unfinished defense per learner: a running one is refused with 409 and its id; one past its deadline plus the
 *   grace is marked `expired` first, so an abandoned tab never locks the learner out. The unique index settles a race.
 * - The card is picked from the learner's visible cards with an answer scored 2, decided here from `user_id` and
 *   `hidden`, since the service role sees every learner's cards. Only the id, question, decision and
 *   session are read: no why, no answer key.
 * - Every timestamp is the server's `new Date()`.
 *
 * @returns 201 `{ defenseId, question, decision, sessionName, repo, startedAt, answerDueAt, answerSeconds, serverNow }`;
 *   401 signed out; 409 a defense is already running (`defenseId`, `status`) or no card has been answered 2 yet; 500 else.
 */
export async function POST() {
  const signedIn = await requireUser();
  if (signedIn instanceof NextResponse) return signedIn;
  const { user } = signedIn;

  try {
    const admin = createAdminClient();
    const now = new Date();

    const open = await admin
      .from("defenses")
      .select("id, status, started_at, follow_up_started_at")
      .eq("user_id", user.id)
      .in("status", UNFINISHED)
      .maybeSingle();
    if (open.error) throw open.error;
    if (open.data) {
      const window = openWindow(open.data);
      if (window && !isLate(window.startedAt, window.seconds, now)) {
        return NextResponse.json(
          {
            error: "You already have a defense running. Finish it first.",
            defenseId: open.data.id,
            status: open.data.status,
          },
          { status: 409 },
        );
      }
      const expired = await admin
        .from("defenses")
        .update({ status: "expired" })
        .eq("id", open.data.id)
        .in("status", UNFINISHED);
      if (expired.error) throw expired.error;
    }

    // shortcut: PostgREST returns at most 1,000 rows a read, far above the 5 answers a day; page it if that changes.
    const answered = await admin
      .from("answers")
      .select("card_id")
      .eq("user_id", user.id)
      .eq("score", 2);
    if (answered.error) throw answered.error;
    const answeredIds = [...new Set(answered.data.map(({ card_id }) => card_id))];
    const cards = answeredIds.length
      ? await admin
          .from("decision_cards")
          .select("id, question, decision, user_id, hidden, session:sessions(title, repo, branch)")
          .in("id", answeredIds)
      : { data: [], error: null };
    if (cards.error) throw cards.error;
    const visible = cards.data.filter((card) => card.user_id === user.id && !card.hidden);
    const picked = pickCard(visible.map((card) => card.id));
    const card = visible.find((candidate) => candidate.id === picked);
    if (!card) {
      return NextResponse.json(
        { error: "Answer a card correctly in your review first, then you can defend it." },
        { status: 409 },
      );
    }

    const startedAt = now.toISOString();
    const created = await admin
      .from("defenses")
      .insert({ user_id: user.id, card_id: card.id, started_at: startedAt })
      .select("id")
      .single();
    if (created.error?.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "You already have a defense running. Finish it first." },
        { status: 409 },
      );
    }
    if (created.error) throw created.error;

    return NextResponse.json(
      {
        defenseId: created.data.id,
        question: card.question,
        // Learner-readable, as on the session page: the decision and where it came from, never the why.
        decision: card.decision,
        sessionName: sessionName(card.session ?? {}),
        repo: card.session?.repo ?? null,
        startedAt,
        answerDueAt: deadlineOf(startedAt, ANSWER_SECONDS).toISOString(),
        answerSeconds: ANSWER_SECONDS,
        serverNow: startedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError("[api/defend/start]", error, "Something went wrong. Try again.");
  }
}
