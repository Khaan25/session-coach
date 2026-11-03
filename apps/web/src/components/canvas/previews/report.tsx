"use client";

// The ownership report: the learner's publish settings on /report, and the public page a reviewer opens at /r/<slug>.
// Data follows the GET /api/report/[slug] contract: decisions, their quotes and dates only. Never the why, the answer
// key, the learner's answers, hidden cards or raw logs.

import { EyeSlashIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";

import { AppFrame, PublicFrame } from "./frames";
import { IdeaNote } from "./parts";

const LINK = "https://coach.ziaa.me/r/sam-rivera-7k2p";

const REPOS = [
  { repo: "session-coach", owned: 12, defended: 2, shown: true },
  { repo: "billing-worker", owned: 5, defended: 0, shown: true },
  { repo: "dotfiles", owned: 3, defended: 0, shown: false },
];

type Decision = {
  repo: string;
  decision: string;
  quote: string;
  file: string | null;
  ownedOn: string;
  defendedOn: string | null;
};

const DECISIONS: Decision[] = [
  {
    repo: "session-coach",
    decision: "Rate limit uploads per CLI token, not per IP",
    quote: "key it on the token so a shared office IP isn't blocked",
    file: "apps/web/src/lib/rate-limit.ts",
    ownedOn: "29 Oct",
    defendedOn: "4 Nov",
  },
  {
    repo: "session-coach",
    decision: "Keep the newest events when a session is too long",
    quote: "the end of the session is where the decisions land",
    file: "apps/web/src/lib/pipeline/process-rows.ts",
    ownedOn: "31 Oct",
    defendedOn: "3 Nov",
  },
  {
    repo: "session-coach",
    decision: "Store CLI tokens hashed and show them once",
    quote: "only the sha256 goes in the table",
    file: "apps/web/src/app/api/cli/tokens/route.ts",
    ownedOn: "2 Nov",
    defendedOn: null,
  },
  {
    repo: "billing-worker",
    decision: "Retry webhooks with a fixed idempotency key",
    quote: "same key on every retry, so Stripe can drop the duplicate",
    file: null,
    ownedOn: "1 Nov",
    defendedOn: null,
  },
];

/** /report: the learner turns the page on, picks repos and copies the link. */
export function ReportSettingsPreview({ on }: { on: boolean }) {
  // Two of these sit on the canvas at once, so every id is per instance.
  const id = useId();
  return (
    <AppFrame path="/report" crumb="Report">
      <Container>
        <AppPageHeader
          title="Report"
          description="A public page of the decisions you own, for a CV, a PR or a code review."
        />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Share my report</h2>
            </CardTitle>
            <CardDescription>
              {on
                ? "On. Anyone with the link can see it. Turn it off and the link stops working at once."
                : "Off. Nobody can see it. Turn it on to get a link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal">
                <Switch id={`${id}-on`} defaultChecked={on} />
                <FieldLabel htmlFor={`${id}-on`}>Share my report</FieldLabel>
              </Field>
              {on && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${id}-link`}>Your link</FieldLabel>
                    <div className="flex gap-2">
                      <Input id={`${id}-link`} readOnly value={LINK} />
                      <CopyButton value={LINK} label="Link" />
                    </div>
                    <FieldDescription>
                      The end of the link is random, so nobody can guess it from your name.
                    </FieldDescription>
                  </Field>
                  <FieldSeparator />
                  <Field>
                    <FieldLabel>Repos on the page</FieldLabel>
                    <FieldDescription>Private work stays off unless you tick it.</FieldDescription>
                  </Field>
                  {REPOS.map((r) => (
                    <Field key={r.repo} orientation="horizontal">
                      <Checkbox id={`${id}-repo-${r.repo}`} defaultChecked={r.shown} />
                      <FieldContent>
                        <FieldLabel htmlFor={`${id}-repo-${r.repo}`}>{r.repo}</FieldLabel>
                        <FieldDescription>
                          {r.owned} owned · {r.defended} defended
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  ))}
                </>
              )}
            </FieldGroup>
          </CardContent>
          {on && (
            <CardFooter>
              <Link href="#item-report-shared" className={buttonVariants({ variant: "secondary" })}>
                See it as a visitor
              </Link>
            </CardFooter>
          )}
        </Card>
        <IdeaNote>
          The page shows each decision, one quote from the session and the date it was owned or
          defended. Never the why, the answer key, your answers, hidden cards or the session log.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

function DecisionCard({ d }: { d: Decision }) {
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
            Defended {d.defendedOn}
          </Badge>
        ) : (
          <Badge variant="outline">Owned {d.ownedOn}</Badge>
        )}
      </CardFooter>
    </Card>
  );
}

/** /r/<slug>: what a reviewer or employer sees. Read-only, no sign-in. */
export function ReportPublicPreview() {
  const shown = REPOS.filter((r) => r.shown);
  return (
    <PublicFrame path="/r/sam-rivera-7k2p">
      <Container>
        <AppPageHeader
          title="Sam Rivera owns 17 decisions"
          description="Decisions an AI agent made in Sam's code, which Sam explained back in their own words. Updated today."
        >
          <PageHeaderStats>
            <PageHeaderStat label="Owned" value={17} detail="explained on day 1, 3 and 7" />
            <PageHeaderStat label="Defended" value={2} detail="timed, with a follow-up" />
            <PageHeaderStat label="Repos" value={shown.length} />
          </PageHeaderStats>
        </AppPageHeader>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>What these mean</h2>
            </CardTitle>
            <CardDescription>
              Owned: Sam explained why the decision was made, from memory, three times over a week.
              Defended: Sam answered a random one against a 3 minute timer with paste off, then a
              follow-up question the AI wrote from that answer. Graded by an AI against the session
              itself, not checked by a person.
            </CardDescription>
          </CardHeader>
        </Card>
        {shown.map((r) => (
          <section
            key={r.repo}
            aria-labelledby={`report-${r.repo}`}
            className="flex flex-col gap-3"
          >
            <h2 id={`report-${r.repo}`} className="type-heading-sm">
              {r.repo} · {r.owned} owned
            </h2>
            {DECISIONS.filter((d) => d.repo === r.repo).map((d) => (
              <DecisionCard key={d.decision} d={d} />
            ))}
          </section>
        ))}
        <IdeaNote>A sample: four of the 17 decisions. The real page lists every one.</IdeaNote>
        <p className="type-body-sm text-text-3">
          Made with Session Coach. Sam chose to share this page and can turn it off at any time.
        </p>
      </Container>
    </PublicFrame>
  );
}

/** /r/<slug> when it's on but nothing is owned yet. */
export function ReportPublicEmptyPreview() {
  return (
    <PublicFrame path="/r/sam-rivera-7k2p">
      <Container>
        <AppPageHeader
          title="Sam Rivera owns 0 decisions so far"
          description="Shared by Sam. Updated today."
        />
        <EmptyState
          icon={ShieldCheckIcon}
          sprite="plant"
          title="Nothing owned yet"
          description="A decision shows here once Sam has explained it back on day 1, 3 and 7."
        />
      </Container>
    </PublicFrame>
  );
}

/** /r/<slug> when the learner turned it off, or the slug never existed: the same page, so links can't be probed. */
export function ReportPublicOffPreview() {
  return (
    <PublicFrame path="/r/sam-rivera-7k2p">
      <Container>
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
      </Container>
    </PublicFrame>
  );
}
