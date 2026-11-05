"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { ErrorState } from "@/components/app/error-state";
import { Button, buttonVariants } from "@/components/ui/button";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { ReportSettings } from "@/lib/report/queries";
import { siteUrl } from "@/lib/site";
import { useAction } from "@/components/app/dry-run";

import { newReportLink, setReportOn, setReportRepo } from "@/app/(app)/settings/actions";

/** Runs a settings action under a toast; throws its error so the caller can roll back. */
function save(action: Promise<{ error: string | null }>, success: string) {
  return toast.promise(
    action.then(({ error }) => {
      if (error) throw new Error(error);
    }),
    { loading: "Saving", success, error: (error: Error) => error.message },
  );
}

/**
 * The public ownership report: the switch, the full link with a copy button, a new-link button, and which repos the
 * page lists. Each control saves on change and goes back if the save fails.
 *
 * @param report - The learner's report settings, or null when they couldn't be read.
 */
export function ReportCard({ report }: { report: ReportSettings | null }) {
  return (
    <Card>
      <CardHeader>
        {/* skullet-own: static text stays real in the settings skeleton. */}
        <CardTitle skullet-own="">
          <h2>Share my report</h2>
        </CardTitle>
        <CardDescription skullet-own="">
          A public page of the decisions you own, for a CV, a PR or a code review. It lists each
          owned decision, one quote from its session and the date you owned or defended it. Never
          the why, the answer key, your answers or the session log.
        </CardDescription>
      </CardHeader>
      {report === null ? (
        <CardContent>
          <ErrorState
            variant="plain"
            title="Couldn't load your report settings"
            message="Reload the page to try again."
          />
        </CardContent>
      ) : (
        <ReportControls report={report} />
      )}
    </Card>
  );
}

function ReportControls({ report }: { report: ReportSettings }) {
  const id = useId();
  const saveOn = useAction(setReportOn);
  const saveNewLink = useAction(newReportLink);
  const [on, setOn] = useState(report.on);
  const [pending, setPending] = useState(false);
  const link = `${siteUrl}/r/${report.slug}`;

  return (
    <>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch
              id={`${id}-on`}
              aria-describedby={`${id}-on-hint`}
              checked={on}
              disabled={pending}
              onCheckedChange={(next) => {
                setOn(next);
                setPending(true);
                save(saveOn({ on: next }), next ? "Report shared" : "Report turned off")
                  .catch(() => setOn(!next))
                  .finally(() => setPending(false));
              }}
            />
            <FieldLabel htmlFor={`${id}-on`}>Share my report</FieldLabel>
          </Field>
          <FieldDescription id={`${id}-on-hint`}>
            {on
              ? "On. Anyone with the link can see the decisions and quotes from the repos you tick below. Turn it off and the link stops working at once."
              : "Off. Nobody can see it. Turn it on to share the link."}
          </FieldDescription>
          {on && (
            <>
              <Field>
                <FieldLabel htmlFor={`${id}-link`}>Your link</FieldLabel>
                <div className="flex gap-2">
                  <Input id={`${id}-link`} readOnly value={link} />
                  <CopyButton value={link} label="Link" />
                </div>
                <FieldDescription>
                  The end of the link is random, so nobody can guess it from your name. A new link
                  stops the old one working.
                </FieldDescription>
              </Field>
              <FieldSeparator />
              <Field>
                <FieldLabel>Repos on the page</FieldLabel>
                <FieldDescription>
                  Private work stays off unless you tick it. The decisions and quotes from a ticked
                  repo become public.
                </FieldDescription>
              </Field>
              {report.repos.length === 0 ? (
                <FieldDescription>
                  A repo shows up here after you upload a session from it.
                </FieldDescription>
              ) : (
                report.repos.map((r) => (
                  <RepoField
                    key={r.repo}
                    repo={r.repo}
                    shown={r.shown}
                    id={`${id}-repo-${r.repo}`}
                  />
                ))
              )}
            </>
          )}
        </FieldGroup>
      </CardContent>
      {on && (
        <CardFooter>
          <Link
            href={`/r/${report.slug}`}
            target="_blank"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            See it as a visitor
          </Link>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setPending(true);
              save(saveNewLink(), "New link made. The old one no longer works.")
                .catch(() => {})
                .finally(() => setPending(false));
            }}
          >
            Make a new link
          </Button>
        </CardFooter>
      )}
    </>
  );
}

function RepoField({ repo, shown, id }: { repo: string; shown: boolean; id: string }) {
  const saveRepo = useAction(setReportRepo);
  const [checked, setChecked] = useState(shown);
  const [pending, setPending] = useState(false);
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        checked={checked}
        disabled={pending}
        onCheckedChange={(next) => {
          setChecked(next);
          setPending(true);
          save(
            saveRepo({ repo, shown: next }),
            next ? `${repo} is on your report` : `${repo} is off your report`,
          )
            .catch(() => setChecked(!next))
            .finally(() => setPending(false));
        }}
      />
      <FieldLabel htmlFor={id}>{repo}</FieldLabel>
    </Field>
  );
}
