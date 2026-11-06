import type { Metadata } from "next";
import { Suspense, cache } from "react";

import { Container } from "@/components/app/container";
import { ReportView, type LoadedReport } from "@/components/report/report-view";
import { authAttemptWait } from "@/lib/auth/rate-limit";
import { getReport } from "@/lib/report/queries";

// One read and one rate-limit spend per request, shared by the page and its metadata.
const load = cache(async (slug: string): Promise<LoadedReport> => {
  if ((await authAttemptWait("report")) > 0) return "limited";
  try {
    return (await getReport(slug)) ?? "off";
  } catch (error) {
    console.error("[r/slug] failed", error instanceof Error ? error.message : error);
    return "error";
  }
});

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const report = await load((await params).slug);
  const name = typeof report === "object" ? (report.name ?? "Ownership report") : null;
  return {
    title: name ? `${name} | Session Coach` : "Report not shared | Session Coach",
    robots: { index: false, follow: false },
  };
}

export default function ReportPage({ params }: PageProps<"/r/[slug]">) {
  // The slug and the rate limit are request-time data (cacheComponents), so the report streams in.
  return (
    <Container>
      <Suspense>
        <ReportBody params={params} />
      </Suspense>
    </Container>
  );
}

async function ReportBody({ params }: Pick<PageProps<"/r/[slug]">, "params">) {
  return <ReportView report={await load((await params).slug)} />;
}
