import { EyeSlashIcon, ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { authAttemptWait } from "@/lib/auth/rate-limit";
import { getReport } from "@/lib/report/queries";
import type { Report, ReportDecision } from "@/lib/report/report";

type Loaded = Report | "off" | "limited" | "error";

// One read and one rate-limit spend per request, shared by the page and its metadata.
const load = cache(async (slug: string): Promise<Loaded> => {
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
  const report = await load((await params).slug);
  if (report === "error") {
    return (
      <ErrorState
        title="Couldn't load this report"
        message="Something went wrong on our side. Reload the page in a minute."
      />
    );
  }
  if (report === "limited") {
    return (
      <ErrorState
        status="warn"
        statusWord="Too many requests"
        title="Slow down a little"
        message="This network opened a lot of reports just now. Try again in a few minutes."
      />
    );
  }
  // Off and unknown are the same page, so a link can't be probed.
  if (report === "off") {
    return (
      <EmptyState
        icon={EyeSlashIcon}
        title="This report isn't shared"
        description="The owner turned it off, or the link is wrong."
        action={
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            What is Session Coach?
          </Link>
        }
      />
    );
  }

  const name = report.name ?? "This learner";
  const first = report.name?.split(" ")[0];
  if (report.owned === 0) {
    return (
      <>
        <AppPageHeader
          title={`${name} owns 0 decisions so far`}
          description={first ? `Shared by ${first}.` : "Shared by its owner."}
        />
        <EmptyState
          icon={ShieldCheckIcon}
          sprite="plant"
          title="Nothing owned yet"
          description="A decision shows here once it has been explained back on day 1, 4 and 11."
        />
      </>
    );
  }

  const who = first ?? "the learner";
  return (
    <>
      <AppPageHeader
        title={`${name} owns ${report.owned} ${report.owned === 1 ? "decision" : "decisions"}`}
        description={`Decisions an AI agent made in ${first ? `${first}'s` : "their"} code, which ${who} explained back in their own words.`}
      >
        <PageHeaderStats>
          <PageHeaderStat
            label="Owned"
            value={report.owned}
            detail="explained on day 1, 4 and 11"
          />
          <PageHeaderStat
            label="Defended"
            value={report.defended}
            detail="timed, with a follow-up"
          />
          <PageHeaderStat label="Repos" value={report.repos.length} />
        </PageHeaderStats>
      </AppPageHeader>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>What these mean</h2>
          </CardTitle>
          <CardDescription>
            Owned: {who} explained why the decision was made, from memory, on day 1, 4 and 11.
            Defended: {who} answered one against a 3 minute timer with paste off, then a follow-up
            question the AI wrote from that answer. Graded by an AI against the session itself, not
            checked by a person.
          </CardDescription>
        </CardHeader>
      </Card>
      {report.repos.map((r, i) => (
        <section key={r.repo} aria-labelledby={`report-repo-${i}`} className="flex flex-col gap-3">
          <h2 id={`report-repo-${i}`} className="type-heading-sm">
            {r.repo} · {r.owned} owned
          </h2>
          {r.decisions.map((d, j) => (
            <DecisionCard key={j} d={d} />
          ))}
        </section>
      ))}
      <p className="type-body-sm text-text-3">
        Made with Session Coach. {first ?? "The owner"} chose to share this page and can turn it off
        at any time.
      </p>
    </>
  );
}

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function DecisionCard({ d }: { d: ReportDecision }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{d.decision}</h3>
        </CardTitle>
        <CardDescription>
          &ldquo;{d.quote}&rdquo;
          {d.file && <span className="block type-code-sm text-text-3">{d.file}</span>}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        {d.defendedOn ? (
          <Badge variant="success">
            <ShieldCheckIcon aria-hidden="true" />
            Defended {DAY.format(new Date(d.defendedOn))}
          </Badge>
        ) : (
          <Badge variant="outline">Owned {DAY.format(new Date(d.ownedOn))}</Badge>
        )}
      </CardFooter>
    </Card>
  );
}
