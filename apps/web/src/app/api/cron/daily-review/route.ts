/**
 * GET /api/cron/daily-review: Vercel Cron, once a day (apps/web/vercel.json). Emails every learner with reminders on
 * who has cards due today in their own time zone, at most once per local day.
 *   200 `{ sent, skipped, failed }`: skipped were already emailed today; failed are logged by user id.
 *   401 missing or wrong `Authorization: Bearer <CRON_SECRET>`, 503 `RESEND_API_KEY` unset, 500 anything else.
 */
import { NextResponse } from "next/server";

import { composeDailyReview } from "@/emails/daily-review-email";
import {
  cronAuthorized,
  dailyReviewRecipients,
  type NewCardRow,
  type ProfileRow,
  resendSender,
  type ReviewRow,
  sendDailyReviews,
} from "@/lib/email/daily-review";
import { newCardsSince } from "@/lib/review/schedule";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

/** Postgres unique_violation: this learner's `email_log` row for today exists, so they were emailed already. */
const UNIQUE_VIOLATION = "23505";
const KIND = "daily_review";
const DEFAULT_FROM = "Session Coach <noreply@coach.ziaa.me>";
/** Learner ids per `in (...)` filter. */
const ID_CHUNK = 100;

/** A `reviews` row with its card, before hidden cards are dropped. */
type AnsweredRow = {
  user_id: string;
  due_on: string | null;
  mastered: boolean;
  card: { decision: string; hidden: boolean } | null;
};

/**
 * Sends today's review reminders.
 *
 * - Checks the cron secret before anything else, and the Resend key before claiming any `email_log` row, so a
 *   misconfigured deploy doesn't use up the day's claims.
 * - Reads learners with reminders on, every answered card (for due, answered and mastered) and the visible cards
 *   from the last week never answered; who gets what is `dailyReviewRecipients`.
 *
 * @param request - Vercel Cron's request.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[api/cron/daily-review] RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Email is not configured on this deployment" },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const profiles = await fetchAll<ProfileRow>((from, to) =>
      admin
        .from("profiles")
        .select("id, email, timezone, notify_email")
        .eq("notify_email", true)
        .order("id")
        .range(from, to),
    );
    // Only learners with reminders on, read in chunks of ids so each request's URL stays short. The admin client skips
    // RLS, so hidden cards (no verified quote) are filtered here, never shown or counted.
    // shortcut: answered and mastered are counted from these rows; count them in SQL once learners number thousands.
    const ids = profiles.map(({ id }) => id);
    const chunks = Array.from({ length: Math.ceil(ids.length / ID_CHUNK) }, (_, i) =>
      ids.slice(i * ID_CHUNK, (i + 1) * ID_CHUNK),
    );
    const reads = await Promise.all(
      chunks.map((chunk) =>
        Promise.all([
          fetchAll<AnsweredRow>((from, to) =>
            admin
              .from("reviews")
              .select("user_id, due_on, mastered, card:decision_cards(decision, hidden)")
              .in("user_id", chunk)
              .order("card_id")
              .range(from, to)
              .overrideTypes<AnsweredRow[], { merge: false }>(),
          ),
          fetchAll<NewCardRow & { reviews: unknown }>((from, to) =>
            admin
              .from("decision_cards")
              .select("user_id, decision, created_at, reviews(card_id)")
              .in("user_id", chunk)
              .eq("hidden", false)
              .gte("created_at", newCardsSince(now))
              .order("id")
              .range(from, to),
          ),
        ]),
      ),
    );
    const answered = reads.flatMap(([rows]) => rows);
    const unanswered = reads.flatMap(([, rows]) => rows);
    const reviews: ReviewRow[] = answered.flatMap(({ card, ...review }) =>
      card && !card.hidden ? [{ ...review, decision: card.decision }] : [],
    );
    // reviews(card_id) is one-to-one (card_id is its primary key): null or [] means never answered.
    const newCards: NewCardRow[] = unanswered
      .filter(({ reviews }) => reviews === null || (Array.isArray(reviews) && reviews.length === 0))
      .map(({ user_id, decision, created_at }) => ({ user_id, decision, created_at }));
    const recipients = dailyReviewRecipients(profiles, reviews, newCards, now);

    const result = await sendDailyReviews(
      recipients,
      (recipient) => composeDailyReview(recipient, siteUrl),
      {
        async claim(userId, sentOn) {
          const { error } = await admin
            .from("email_log")
            .insert({ user_id: userId, kind: KIND, sent_on: sentOn });
          if (error?.code === UNIQUE_VIOLATION) return false;
          if (error) throw new Error(error.message);
          return true;
        },
        send: resendSender(apiKey, process.env.EMAIL_FROM || DEFAULT_FROM),
        async record(userId, sentOn, resendId) {
          const { error } = await admin
            .from("email_log")
            .update({ resend_id: resendId })
            .eq("user_id", userId)
            .eq("kind", KIND)
            .eq("sent_on", sentOn);
          if (error) throw new Error(error.message);
        },
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/cron/daily-review] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The daily review run failed." }, { status: 500 });
  }
}
