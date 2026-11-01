import { constantTimeEqual } from "../auth/constant-time.ts";
import { isDue } from "../review/schedule.ts";
import { localDate } from "../sessions/rows.ts";

// The daily review email's pure core: who gets one, what it says, and the claim-then-send loop. The route
// (app/api/cron/daily-review) supplies the database and Resend, so node --test runs all of this with fakes.

/** A `profiles` row as the cron reads it. */
export type ProfileRow = {
  id: string;
  email: string | null;
  timezone: string;
  notify_email: boolean;
};

/** A `reviews` row as the cron reads it. */
export type ReviewRow = { user_id: string; due_on: string | null; mastered: boolean };

/** A learner to email: `today` is their local date, which is also the `email_log.sent_on` the send claims. */
export type Recipient = { userId: string; email: string; today: string; count: number };

/** One message for the provider. `idempotencyKey` lets the provider drop a repeat of the same send. */
export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

/** What the loop needs from the outside world; the route passes Supabase and Resend, tests pass fakes. */
export type DailyReviewDeps = {
  /** Inserts the `email_log` row. False when the row already exists (a rerun the same day). */
  claim: (userId: string, sentOn: string) => Promise<boolean>;
  /** Sends one email and returns the provider's message id. */
  send: (email: OutgoingEmail) => Promise<string>;
  /** Stores the provider's id on the claimed row. */
  record: (userId: string, sentOn: string, resendId: string) => Promise<void>;
};

/** The cron's response body. */
export type DailyReviewResult = { sent: number; skipped: number; failed: number };

/**
 * Whether a cron request carries `Authorization: Bearer <CRON_SECRET>`. An unset secret lets nobody in.
 *
 * @param header - The request's `Authorization` header, or null.
 * @param secret - `process.env.CRON_SECRET`.
 */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return constantTimeEqual(header.slice("Bearer ".length), secret);
}

/**
 * The learners to remind today: reminders on, an email address, and at least one card due in their own time zone.
 *
 * @param profiles - Learners, any `notify_email`; those with it off are left out here.
 * @param reviews - Review rows; rows of other learners or not yet due are ignored.
 * @param now - The cron's current time. "Today" is each learner's date at this moment.
 * @returns One recipient per learner with cards due, with their count.
 */
export function dailyReviewRecipients(
  profiles: ProfileRow[],
  reviews: ReviewRow[],
  now: Date,
): Recipient[] {
  const byUser = Map.groupBy(reviews, (review) => review.user_id);
  return profiles.flatMap(({ id, email, timezone, notify_email }) => {
    if (!notify_email || !email) return [];
    const today = localDate(timezone, now);
    const count = (byUser.get(id) ?? []).filter((review) => isDue(review, today)).length;
    return count > 0 ? [{ userId: id, email, today, count }] : [];
  });
}

/** What the reminder says. The template in `emails/daily-review-email.tsx` lays it out; `text` is the plain part. */
export type DailyReviewCopy = {
  subject: string;
  /** The inbox preview line, after the subject. */
  preview: string;
  heading: string;
  body: string;
  cta: string;
  reviewUrl: string;
  settingsUrl: string;
  text: string;
};

/**
 * The reminder's words: the due count, a link to /review and how to turn reminders off. No tracking.
 *
 * @param count - Cards due today, at least 1.
 * @param siteUrl - The deployed origin, without a trailing slash.
 */
export function dailyReviewCopy(count: number, siteUrl: string): DailyReviewCopy {
  const cards = count === 1 ? "1 card" : `${count} cards`;
  const reviewUrl = `${siteUrl}/review`;
  const settingsUrl = `${siteUrl}/settings`;
  const heading =
    count === 1 ? "1 decision to explain today" : `${count} decisions to explain today`;
  const body =
    "Explain each one back in your own words. You get a score and what you missed, and the card comes back on day 1, 3 and 7 until you've got it.";
  const footer = "You get this because daily reminders are on. Turn them off in Settings";
  return {
    subject: `${cards} to review today`,
    preview: `You have ${cards} due. Explain them back while they're fresh.`,
    heading,
    body,
    cta: "Start today's review",
    reviewUrl,
    settingsUrl,
    text: [
      heading,
      `You have ${cards} due for review today. ${body}`,
      `Start today's review: ${reviewUrl}`,
      `${footer}: ${settingsUrl}`,
    ].join("\n\n"),
  };
}

/** Builds one learner's email from their due count; the route renders the React Email template here. */
export type ComposeDailyReview = (
  count: number,
) => Promise<Pick<OutgoingEmail, "subject" | "text" | "html">>;

/**
 * Emails each recipient once per local day.
 *
 * - Claims the `email_log` row before sending, so a rerun or a crash after the send never sends twice
 *   (docs/rules/error-handling.md). A claimed row whose send failed stays claimed: no retry that day.
 * - One learner's failure is logged with their id only and the loop goes on.
 *
 * @param recipients - From `dailyReviewRecipients`.
 * @param compose - Builds the email for a due count.
 * @param deps - Database and provider calls.
 * @returns How many were sent, skipped as already sent today, and failed.
 */
export async function sendDailyReviews(
  recipients: Recipient[],
  compose: ComposeDailyReview,
  deps: DailyReviewDeps,
): Promise<DailyReviewResult> {
  const result: DailyReviewResult = { sent: 0, skipped: 0, failed: 0 };
  for (const { userId, email, today, count } of recipients) {
    let resendId: string;
    try {
      if (!(await deps.claim(userId, today))) {
        result.skipped++;
        continue;
      }
      resendId = await deps.send({
        to: email,
        ...(await compose(count)),
        idempotencyKey: `daily_review/${userId}/${today}`,
      });
      result.sent++;
    } catch (err) {
      result.failed++;
      console.error(`[cron/daily-review] send failed for user ${userId}`, errorMessage(err));
      continue;
    }
    // The email is out; a failure here only loses the provider id.
    await deps.record(userId, today, resendId).catch((err: unknown) => {
      console.error(
        `[cron/daily-review] resend_id not saved for user ${userId}`,
        errorMessage(err),
      );
    });
  }
  return result;
}

/** How long one Resend call may take before it counts as failed. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * A `send` for `DailyReviewDeps` through the Resend REST API. Errors carry the status only, never the response body,
 * which can echo the recipient's address.
 *
 * @param apiKey - `RESEND_API_KEY`.
 * @param from - The sender, such as `Session Coach <noreply@coach.ziaa.me>`.
 */
export function resendSender(apiKey: string, from: string): DailyReviewDeps["send"] {
  return async ({ to, subject, text, html, idempotencyKey }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      // A stalled call would hold the serial loop until the function is killed; fail it and move to the next learner.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
    const { id } = (await response.json()) as { id: string };
    return id;
  };
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
