import { render } from "react-email";

import { dailyReviewCopy } from "@/lib/email/daily-review";
import type { Recipient } from "@/lib/email/daily-review";
import { listUnsubscribeHeaders } from "@/lib/email/unsubscribe";

import { DailyReviewEmail } from "./daily-review-email";

/**
 * One learner's reminder: subject, plain text, the rendered HTML and, with a link, the one-click unsubscribe headers.
 *
 * @param recipient - What this learner has to do and has done.
 * @param siteUrl - The deployed origin, without a trailing slash.
 * @param unsubscribeUrl - This learner's signed link (`lib/email/unsubscribe.ts`), or null to leave it out.
 */
export async function composeDailyReview(
  recipient: Recipient,
  siteUrl: string,
  unsubscribeUrl: string | null = null,
) {
  const copy = dailyReviewCopy(recipient, siteUrl, unsubscribeUrl);
  const html = await render(<DailyReviewEmail copy={copy} />);
  return {
    subject: copy.subject,
    text: copy.text,
    html,
    headers: unsubscribeUrl ? listUnsubscribeHeaders(unsubscribeUrl) : undefined,
  };
}
