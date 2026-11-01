/**
 * GET /api/cron/daily-review: Vercel Cron, once a day (apps/web/vercel.json). Emails every learner with reminders on
 * who has cards due today in their own time zone, at most once per local day.
 *   200 `{ sent, skipped, failed }`: skipped were already emailed today; failed are logged by user id.
 *   401 missing or wrong `Authorization: Bearer <CRON_SECRET>`, 503 `RESEND_API_KEY` unset, 500 anything else.
 */
import { NextResponse } from "next/server";

import {
  cronAuthorized,
  dailyReviewRecipients,
  type ProfileRow,
  resendSender,
  type ReviewRow,
  sendDailyReviews,
} from "@/lib/email/daily-review";
import { localDate } from "@/lib/sessions/rows";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

/** Postgres unique_violation: this learner's `email_log` row for today exists, so they were emailed already. */
const UNIQUE_VIOLATION = "23505";
const KIND = "daily_review";
const DEFAULT_FROM = "Session Coach <noreply@coach.ziaa.me>";

/**
 * Sends today's review reminders.
 *
 * - Checks the cron secret before anything else, and the Resend key before claiming any `email_log` row, so a
 *   misconfigured deploy doesn't use up the day's claims.
 * - Reads learners with reminders on and their unmastered reviews due by the latest "today" of any time zone; the
 *   per-learner date rule is `dailyReviewRecipients`.
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
    // No learner's today is later than the latest one, so every card due for anyone comes back.
    const latest = profiles
      .map(({ timezone }) => localDate(timezone, now))
      .sort()
      .at(-1);
    const reviews = latest
      ? await fetchAll<ReviewRow>((from, to) =>
          admin
            .from("reviews")
            .select("user_id, due_on, mastered")
            .eq("mastered", false)
            .lte("due_on", latest)
            .order("card_id")
            .range(from, to),
        )
      : [];
    const recipients = dailyReviewRecipients(profiles, reviews, now);

    const result = await sendDailyReviews(recipients, siteUrl, {
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
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/cron/daily-review] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The daily review run failed." }, { status: 500 });
  }
}
