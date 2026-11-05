"use client";

// /r/[slug], the public ownership report: the real ReportView that the page renders, in the marketing frame, fed a
// synthetic learner. Owned decisions and one quote each; never the why, an answer or the answer key.

import { Container } from "@/components/app/container";
import { ReportView, type LoadedReport } from "@/components/report/report-view";

import { PublicFrame } from "../frames";

const SAMPLE: LoadedReport = {
  name: "Sam Rivera",
  owned: 3,
  defended: 1,
  repos: [
    {
      repo: "session-coach",
      owned: 2,
      defended: 1,
      decisions: [
        {
          decision: "Rate limit uploads per CLI token, not per IP",
          quote: "Key the limiter on the CLI token so one office IP can't block everyone.",
          file: "apps/web/src/app/api/sessions/route.ts",
          ownedOn: "2026-10-27T09:00:00Z",
          defendedOn: "2026-10-30T09:00:00Z",
        },
        {
          decision: "Return 429 with a Retry-After header",
          quote: "Send Retry-After so the CLI knows exactly when it can try again.",
          file: null,
          ownedOn: "2026-10-29T09:00:00Z",
          defendedOn: null,
        },
      ],
    },
    {
      repo: "rapporteur",
      owned: 1,
      defended: 0,
      decisions: [
        {
          decision: "Skip unknown JSONL line types instead of throwing",
          quote: "Skip line types we don't know, so a new Claude Code version can't break parsing.",
          file: "src/transcriptParser.ts",
          ownedOn: "2026-11-01T09:00:00Z",
          defendedOn: null,
        },
      ],
    },
  ],
};

export function MapReport({ report = SAMPLE }: { report?: LoadedReport }) {
  return (
    <PublicFrame path="/r/0f3a9c2e7b41d85a6c1e09b2d4f7a3c8">
      <Container>
        <ReportView report={report} />
      </Container>
    </PublicFrame>
  );
}
