import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  SAMPLE_NOW,
  SAMPLE_OWNERSHIP,
  SAMPLE_QUEUE,
  SAMPLE_SESSIONS,
} from "@/components/dashboard/dashboard-sample";
import { SessionRows } from "@/components/sessions/session-list";

/** The dashboard drawn from sample rows: what the page's loading skeleton measures, in loading.tsx and the page. */
export function DashboardSampleView() {
  return (
    <DashboardView
      firstVisit={false}
      tabs={null}
      repo={null}
      queue={SAMPLE_QUEUE}
      due={SAMPLE_QUEUE}
      empty={null}
      ownership={SAMPLE_OWNERSHIP}
      sessions={<SessionRows rows={SAMPLE_SESSIONS} now={SAMPLE_NOW} />}
    />
  );
}
