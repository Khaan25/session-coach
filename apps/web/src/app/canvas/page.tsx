import type { Metadata } from "next";

import { IdeasCanvas } from "@/components/canvas/registry";
import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";

export const metadata: Metadata = {
  title: "Ideas canvas",
  robots: { index: false },
};

/**
 * /canvas: every screen and state of the Friday ideas, live and side by side, for the team and the demo.
 * Synthetic data only, so it is safe to serve on production; it stays out of search results.
 */
export default function CanvasPage() {
  return <IdeasCanvas heroCard={<DecisionCardPreview />} />;
}
