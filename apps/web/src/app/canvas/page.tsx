import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IdeasCanvas } from "@/components/canvas/registry";

export const metadata: Metadata = {
  title: "Ideas canvas",
  robots: { index: false },
};

/**
 * /canvas: every screen and state of the Friday ideas, live and side by side, for the team and the demo.
 * Synthetic data only. Not served on the production deployment; local dev and preview deploys only.
 */
export default function CanvasPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <IdeasCanvas />;
}
