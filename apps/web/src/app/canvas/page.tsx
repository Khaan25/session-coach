import type { Metadata } from "next";
import { render } from "react-email";

import DeleteAccountPage from "@/app/(marketing)/delete-account/page";
import HowItWorksPage from "@/app/(marketing)/how-it-works/page";
import HomePage from "@/app/(marketing)/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import PrivacyPage from "@/app/(marketing)/privacy/page";
import SupportPage from "@/app/(marketing)/support/page";
import TermsPage from "@/app/(marketing)/terms/page";
import ConfirmPage from "@/app/auth/confirm/page";
import AuthErrorPage from "@/app/auth/error/page";
import { IdeasCanvas } from "@/components/canvas/registry";
import { DailyReviewEmail } from "@/emails/daily-review-email";
import { dailyReviewCopy } from "@/lib/email/daily-review";
import { siteUrl } from "@/lib/site";

/** A route's props for a link with this query and no path params, as Next hands them to the page. */
const query = (searchParams: Record<string, string>) => ({
  params: Promise.resolve({}),
  searchParams: Promise.resolve(searchParams),
});

export const metadata: Metadata = {
  title: "UI flow canvas",
  robots: { index: false },
};

/**
 * /canvas: the app's UI flow, one row per stage, then every route in every state, every screen live, for the team and
 * the demo. Synthetic data only, so it is safe to serve on production; it stays out of search results. The public
 * pages, the query-driven auth pages and the daily email render here, on the server, and go down to the client canvas
 * as finished screens.
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
        support: <SupportPage />,
        privacy: <PrivacyPage />,
        terms: <TermsPage />,
        deleteAccount: <DeleteAccountPage />,
        // The query each would get from a link: none (an incomplete link), and an expired one.
        authConfirm: <ConfirmPage {...query({})} />,
        authError: <AuthErrorPage {...query({ code: "link_expired" })} />,
        authErrorUnknown: <AuthErrorPage {...query({})} />,
        email: <iframe title="Daily review email" srcDoc={email} className="size-full" />,
      }}
    />
  );
}
