import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { IdeasCanvas } from "@/components/canvas/registry";
import { DecisionCardPreview } from "@/components/marketing/decision-card-preview";

export const metadata: Metadata = {
  title: "Ideas canvas",
  robots: { index: false },
};

/**
 * /canvas: every screen and state of the Friday ideas, live and side by side, for the team and the demo.
 * Synthetic data only. Not served on the production deployment; local dev and preview deploys only.
 */
export default function CanvasPage() {
  return (
    <Suspense>
      <ProductionGate />
    </Suspense>
  );
}

/** Checked per request, so a preview build promoted to production can't keep a baked-in answer. */
async function ProductionGate() {
  await connection();
  if (process.env.VERCEL_ENV === "production") notFound();
  return <IdeasCanvas heroCard={<DecisionCardPreview />} />;
}
