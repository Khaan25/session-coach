import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, CodeBlock } from "@/components/ui/code-block";

// The hook packages/cli/README.md documents for `sync`, as written there: per project, pinned, async.
const HOOK_JSON = `{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear",
        "hooks": [
          {
            "type": "command",
            "command": "npx --yes session-coach@0.3.0 sync",
            "async": true
          }
        ]
      }
    ]
  }
}`;

/** What the page already knows: the newest connected device and how many sessions arrived. null: not known. */
export type SetupProgress = { device: string | null; sessions: number | null };

/**
 * /setup's by-hand path: sign in, turn on the hook, push, then what happens next. Each step says what it does and
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
            what="A SessionStart hook runs sync each time Claude Code starts in this project. In the background it uploads one finished session, newest first, and skips any session changed in the last 5 minutes, so the one you are in waits for a later start. It goes in the project's .claude/settings.json, not your user settings, so each project is its own choice."
          >
            <CodeBlock
              code={HOOK_JSON}
              language="json"
              filename=".claude/settings.json"
              lineNumbers={false}
              copyLabel="Copy the hook"
            />
            <p className="type-body-sm text-text-2">
              Merge it with what the file already holds. The version is pinned so the hook
              doesn&apos;t run whatever is newest on npm; raise it when you want a newer{" "}
              <Code>sync</Code>. It prints nothing: <Code>~/.session-coach/sync.log</Code> has a
              line for each run that uploads or fails. Remove the hook to turn it off.
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

          <Step
            number={4}
            title="What happens next"
            what="Within a few minutes the session becomes up to 5 decision cards on your dashboard, one for each real choice your agent made."
          >
            <ul className="flex list-disc flex-col gap-2 ps-5 type-body text-text-2">
              <li>
                Explain each card in your own words before you see the why. A model grades the
                answer 0, 1 or 2.
              </li>
              <li>
                Each card comes back on days 1, 4 and 11. Pass the day-11 review and the decision is
                owned.
              </li>
              <li>Defend it, a harder follow-up question on an explained card, is optional.</li>
            </ul>
            <p>
              <Link href="/dashboard" className={buttonVariants({ variant: "link" })}>
                Go to the dashboard
              </Link>
            </p>
          </Step>
        </ol>
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
