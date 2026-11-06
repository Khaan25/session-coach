import type { Metadata } from "next";
import { render } from "react-email";

import HowItWorksPage from "@/app/(marketing)/how-it-works/page";
import HomePage from "@/app/(marketing)/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import { IdeasCanvas } from "@/components/canvas/registry";
import { DailyReviewEmail } from "@/emails/daily-review-email";
import { dailyReviewCopy } from "@/lib/email/daily-review";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ideas canvas",
  robots: { index: false },
};

/**
 * /canvas: every screen and state of the app, live and side by side, for the team and the demo. Synthetic data only,
 * so it is safe to serve on production; it stays out of search results. The landing page and the daily email render
 * here, on the server, and go down to the client canvas as finished screens.
 */
export default async function CanvasPage() {
  // The email the cron sends, for a synthetic learner: decision titles only, never an answer.
  const email = await render(
    <DailyReviewEmail
      copy={dailyReviewCopy(
        {
          due: ["Rate limit the upload route per token, not per IP"],
          fresh: [
            "Return 429 with a Retry-After header",
            "Skip unknown JSONL line types instead of throwing",
          ],
          answered: 18,
          mastered: 6,
        },
        siteUrl,
      )}
      siteUrl={siteUrl}
    />,
  );
  return (
    <IdeasCanvas
      screens={{
        home: <HomePage />,
        howItWorks: <HowItWorksPage />,
        pricing: <PricingPage />,
        email: <iframe title="Daily review email" srcDoc={email} className="size-full" />,
      }}
    />
  );
}
