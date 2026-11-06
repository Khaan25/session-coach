import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, CodeBlock } from "@/components/ui/code-block";

// The hook packages/cli/README.md documents for `sync`, as written there: per project, pinned, async.
/** What the page already knows: the newest connected device and how many sessions arrived. null: not known. */
export type SetupProgress = { device: string | null; sessions: number | null };

/**
 * /setup's by-hand path: sign in, turn on the hook, push, then one line on what happens next. Each step says what it does and
 * why before its command. Steps the page can see are marked done: a connected device (1) and an uploaded session (3).
 * The hook (2) lives on the learner's disk, so it is never marked.
 */
export function SetupSteps({ progress }: { progress?: SetupProgress }) {
  const device = progress?.device ?? null;
  const sessions = progress?.sessions ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Do it step by step</h2>
        </CardTitle>
        <CardDescription>
          The same steps the prompt runs, by hand. Run them in your project&apos;s folder; they need
          Node 20 or later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-8">
          <Step
            number={1}
            title="Sign in from your terminal"
            done={device !== null}
            what="Connects this computer to your account, so the CLI can upload for you. It prints a code and opens your browser: check the code matches, then approve. There is no token to copy."
          >
            <CodeBlock variant="command" command="npx session-coach login" />
            {device && (
              <p className="type-body-sm text-text-2">
                Signed in on {device}. It is listed under Connected devices below.
              </p>
            )}
          </Step>

          <Step
            number={2}
            title="Turn on automatic uploads for this project"
            what="Run init in the project's folder. It adds two hooks to the project's .claude/settings.local.json (your personal settings, kept out of git): one uploads each Claude Code session as it ends, the other catches up on any it missed when a session starts. Each project is its own choice."
          >
            <CodeBlock variant="command" command="npx session-coach init" />
            <p className="type-body-sm text-text-2">
              Run it again any time: it leaves exactly one of each hook. The hooks print nothing:{" "}
              <Code>~/.session-coach/sync.log</Code> has a line for each run that uploads or fails.
              Remove them from the file to turn uploads off.
            </p>
            <p className="type-body-sm text-text-2">
              Sessions upload without you reading them first, and secret removal is best-effort, so
              add it only to projects whose sessions you are happy to send. Windows isn&apos;t
              tested yet.
            </p>
          </Step>

          <Step
            number={3}
            title="Send your newest session"
            done={sessions > 0}
            what="Uploads the last Claude Code session you ran in this folder now, so you don't wait for the next session start."
          >
            <CodeBlock variant="command" command="npx session-coach push --latest" />
            <p className="type-body-sm text-text-2">
              Or send one log by its path; put your file&apos;s path in place of the example:
            </p>
            <CodeBlock variant="command" command="npx session-coach push ./your-session.jsonl" />
            {sessions > 0 && (
              <p className="type-body-sm text-text-2">
                {sessions === 1 ? "1 session has" : `${sessions} sessions have`} arrived so far.
              </p>
            )}
          </Step>
        </ol>
        <p className="mt-8 type-body text-text-2">
          Within a few minutes the session becomes up to 5 decision cards on your{" "}
          <Link href="/dashboard" className={buttonVariants({ variant: "link" })}>
            dashboard
          </Link>
          , one for each real choice your agent made.
        </p>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  what,
  done = false,
  children,
}: {
  number: number;
  title: string;
  /** What the step does and why, read before its command. */
  what: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="type-heading-sm text-text-1">
          {number}. {title}
        </h3>
        {done && (
          <Badge variant="success">
            <CheckCircleIcon weight="fill" aria-hidden="true" />
            Done
          </Badge>
        )}
      </div>
      <p className="type-body text-text-2">{what}</p>
      {children}
    </li>
  );
}
