import { EyeSlashIcon, ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import type { Report, ReportDecision } from "@/lib/report/report";

/** What /r/[slug] loaded: the report, off (or an unknown link), rate limited, or a failed read. */
export type LoadedReport = Report | "off" | "limited" | "error";

/** The public ownership report, or why there is none. Shared by /r/[slug] and /canvas. */
export function ReportView({ report }: { report: LoadedReport }) {
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
