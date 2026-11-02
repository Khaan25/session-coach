import { constantTimeEqual } from "../auth/constant-time.ts";
import { isDue, newCardsSince } from "../review/schedule.ts";
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

/**
 * A `reviews` row as the cron reads it, with its card's decision. One row per card the learner has answered, so it
 * also counts what they've answered and mastered.
 */
export type ReviewRow = {
  user_id: string;
  due_on: string | null;
  mastered: boolean;
  decision: string;
};

/** A visible card never answered (no `reviews` row), as the cron reads it. */
export type NewCardRow = { user_id: string; decision: string; created_at: string };

/**
 * A learner to email: `today` is their local date, which is also the `email_log.sent_on` the send claims. `due` and
 * `fresh` are decision titles, due first by date, then new by age.
 */
export type Recipient = {
  userId: string;
  email: string;
  today: string;
  due: string[];
  fresh: string[];
  answered: number;
  mastered: number;
};

/**
 * One message for the provider. `idempotencyKey` lets the provider drop a repeat of the same send; `headers` are extra
 * message headers, such as `List-Unsubscribe`.
 */
export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  headers?: Record<string, string>;
};

/** What the loop needs from the outside world; the route passes Supabase and Resend, tests pass fakes. */
export type DailyReviewDeps = {
  /** Inserts the `email_log` row. False when the row already exists (a rerun the same day). */
  claim: (userId: string, sentOn: string) => Promise<boolean>;
  /** Sends one email and returns the provider's message id. */
  send: (email: OutgoingEmail) => Promise<string>;
  /** Stores the provider's id on the claimed row. */
  record: (userId: string, sentOn: string, resendId: string) => Promise<void>;
  /** Deletes the claimed row after a failed send, so a rerun the same day can try again. */
  release: (userId: string, sentOn: string) => Promise<void>;
};

/** The cron's response body. */
export type DailyReviewResult = { sent: number; skipped: number; failed: number };

/**
 * Whether a cron request carries `Authorization: Bearer <CRON_SECRET>`. An unset secret lets nobody in.
 *
 * @param header - The request's `Authorization` header, or null.
 * @param secret - `process.env.CRON_SECRET`.
 */
export function cronAuthorized(
  header: string | null,
  secret: string | undefined,
): secret is string {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return constantTimeEqual(header.slice("Bearer ".length), secret);
}

/**
 * The learners to remind today: reminders on, an email address, and at least one card to do. A card to do is either
 * due again in their own time zone, or new (never answered) and from the last `NEW_CARD_DAYS` days, the same window
 * the review queue offers new cards in. Older unanswered cards stop counting, so ignored reminders end after a week.
 *
 * @param profiles - Learners, any `notify_email`; those with it off are left out here.
 * @param reviews - Answered cards. Rows of other learners or not yet due are ignored for `due`.
 * @param newCards - Never-answered visible cards; ones older than the window are ignored.
 * @param now - The cron's current time. "Today" is each learner's date at this moment.
 * @returns One recipient per learner with something to do.
 */
export function dailyReviewRecipients(
  profiles: ProfileRow[],
  reviews: ReviewRow[],
  newCards: NewCardRow[],
  now: Date,
): Recipient[] {
  const reviewsByUser = Map.groupBy(reviews, (review) => review.user_id);
  const since = newCardsSince(now);
  const newByUser = Map.groupBy(
    newCards.filter((card) => card.created_at >= since),
    (card) => card.user_id,
  );
  return profiles.flatMap(({ id, email, timezone, notify_email }) => {
    if (!notify_email || !email) return [];
    const today = localDate(timezone, now);
    const mine = reviewsByUser.get(id) ?? [];
    const due = mine
      .filter((review) => isDue(review, today))
      .toSorted((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? ""))
      .map((review) => review.decision);
    const fresh = (newByUser.get(id) ?? [])
      .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
      .map((card) => card.decision);
    if (due.length + fresh.length === 0) return [];
    const mastered = mine.filter((review) => review.mastered).length;
    return [{ userId: id, email, today, due, fresh, answered: mine.length, mastered }];
  });
}

/** At most this many decision titles in one email; the rest are "and N more". */
const LISTED = 3;
/** Long decisions are cut to this many characters in the list. */
const TITLE_MAX = 90;

/** One listed decision and whether it's new or due again. */
export type ListedCard = { title: string; tag: "New" | "Due" };

/** What the reminder says. The template in `emails/daily-review-email.tsx` lays it out; `text` is the plain part. */
export type DailyReviewCopy = {
  subject: string;
  /** The inbox preview line, after the subject. */
  preview: string;
  heading: string;
  /** "3 new from your sessions · 2 due again", leaving out a zero. */
  summary: string;
  cards: ListedCard[];
  /** "and 2 more", or null when every card is listed. */
  more: string | null;
  body: string;
  /** "18 answered so far, 6 mastered", or a first-time line. */
  progress: string;
  cta: string;
  reviewUrl: string;
  footer: string;
  footerLink: string;
  settingsUrl: string;
  /** One-click unsubscribe, or null when the deployment can't sign the link. */
  unsubscribeUrl: string | null;
  text: string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// By code point, not UTF-16 unit, so an emoji at the cut is never split in half.
const cut = (title: string) => {
  const chars = [...title];
  return chars.length > TITLE_MAX
    ? `${chars
        .slice(0, TITLE_MAX - 1)
        .join("")
        .trimEnd()}…`
    : title;
};

/**
 * The reminder's words: what's due and new, up to 3 decision titles (never the answers), progress so far, a link to
 * /review and how to turn reminders off. No tracking.
 *
 * @param recipient - What this learner has to do and has done.
 * @param siteUrl - The deployed origin, without a trailing slash.
 * @param unsubscribeUrl - This learner's signed one-click link (`lib/email/unsubscribe.ts`), or null to leave it out.
 */
export function dailyReviewCopy(
  { due, fresh, answered, mastered }: Pick<Recipient, "due" | "fresh" | "answered" | "mastered">,
  siteUrl: string,
  unsubscribeUrl: string | null = null,
): DailyReviewCopy {
  const total = due.length + fresh.length;
  const reviewUrl = `${siteUrl}/review`;
  const settingsUrl = `${siteUrl}/settings`;
  const heading = `${plural(total, "decision", "decisions")} to explain today`;
  const summary = [
    fresh.length > 0 && `${fresh.length} new from your sessions`,
    due.length > 0 && `${due.length} due again`,
  ]
    .filter(Boolean)
    .join(" · ");
  const all: ListedCard[] = [
    ...due.map((title) => ({ title: cut(title), tag: "Due" as const })),
    ...fresh.map((title) => ({ title: cut(title), tag: "New" as const })),
  ];
  const cards = all.slice(0, LISTED);
  const more = all.length > LISTED ? `and ${all.length - LISTED} more` : null;
  const body =
    "Explain each one back in your own words. You get a score and what you missed, and the card comes back on day 1, 3 and 7 until you've got it.";
  const progress =
    answered === 0
      ? "These are your first cards from Session Coach."
      : `${plural(answered, "card", "cards")} answered so far, ${mastered} mastered.`;
  const footer = "You get this because daily reminders are on.";
  const footerLink = "Turn them off in Settings";
  return {
    subject: `${plural(total, "card", "cards")} to review today`,
    preview: `${summary}. Explain them back while they're fresh.`,
    heading,
    summary,
    cards,
    more,
    body,
    progress,
    cta: "Start today's review",
    reviewUrl,
    footer,
    footerLink,
    settingsUrl,
    unsubscribeUrl,
    text: [
      heading,
      summary,
      [...cards.map(({ title, tag }) => `- ${title} (${tag})`), ...(more ? [more] : [])].join("\n"),
      body,
      progress,
      `Start today's review: ${reviewUrl}`,
      `${footer} ${footerLink}: ${settingsUrl}`,
      ...(unsubscribeUrl ? [`Unsubscribe: ${unsubscribeUrl}`] : []),
    ].join("\n\n"),
  };
}

/** Builds one learner's email; the route renders the React Email template here. */
export type ComposeDailyReview = (
  recipient: Recipient,
) => Promise<Pick<OutgoingEmail, "subject" | "text" | "html" | "headers">>;

/**
 * Emails each recipient once per local day.
 *
 * - Builds the email first, so a template error leaves the day unclaimed and a same-day rerun can still send.
 * - Then claims the `email_log` row before sending, so a rerun or a crash after the send never sends twice
 *   (docs/rules/error-handling.md). A send the provider refused (`SendRejectedError`) releases its claim, so a rerun
 *   the same day retries it. A timeout or network error keeps the claim: the email may have gone out.
 * - One learner's failure is logged with their id only and the loop goes on.
 *
 * @param recipients - From `dailyReviewRecipients`.
 * @param compose - Builds one recipient's email.
 * @param deps - Database and provider calls.
 * @returns How many were sent, skipped as already sent today, and failed.
 */
export async function sendDailyReviews(
  recipients: Recipient[],
  compose: ComposeDailyReview,
  deps: DailyReviewDeps,
): Promise<DailyReviewResult> {
  const result: DailyReviewResult = { sent: 0, skipped: 0, failed: 0 };
  for (const recipient of recipients) {
    const { userId, email, today } = recipient;
    let resendId: string;
    let claimed = false;
    try {
      const message = await compose(recipient);
      claimed = await deps.claim(userId, today);
      if (!claimed) {
        result.skipped++;
        continue;
      }
      resendId = await deps.send({
        to: email,
        ...message,
        idempotencyKey: `daily_review/${userId}/${today}`,
      });
      result.sent++;
    } catch (err) {
      result.failed++;
      console.error(`[cron/daily-review] send failed for user ${userId}`, errorMessage(err));
      // Only a sure rejection frees the day: after a timeout the email may be out, and a rerun with a changed payload
      // under the same Idempotency-Key would be refused anyway. That learner waits for tomorrow.
      if (claimed && err instanceof SendRejectedError) {
        await deps.release(userId, today).catch((releaseErr: unknown) => {
          console.error(
            `[cron/daily-review] claim not released for user ${userId}`,
            errorMessage(releaseErr),
          );
        });
      }
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

/**
 * The provider answered and refused the email, so it surely wasn't sent and the claim can be released. A timeout or a
 * network error isn't this: the email may have gone out.
 */
export class SendRejectedError extends Error {
  name = "SendRejectedError";
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
  return async ({ to, subject, text, html, idempotencyKey, headers }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, text, html, headers }),
      // A stalled call would hold the serial loop until the function is killed; fail it and move to the next learner.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    // 409 means this Idempotency-Key was already used, so an earlier try may have been accepted: not a sure rejection.
    if (!response.ok) {
      const message = `Resend responded ${response.status}`;
      throw response.status === 409 ? new Error(message) : new SendRejectedError(message);
    }
    const { id } = (await response.json()) as { id: string };
    return id;
  };
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
