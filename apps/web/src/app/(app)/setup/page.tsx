import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { TokenSection } from "@/components/setup/token-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code, CodeBlock } from "@/components/ui/code-block";
import { SAMPLE_TOKEN, sampleTokens } from "@/lib/sample/account";
import { SAMPLE_NOW } from "@/lib/sample/sessions";
import { formatRelativeTime } from "@/lib/relative-time";

export const metadata: Metadata = { title: "Setup" };

// TODO(zia): the commands and what each does come from Kasam's CLI README (packages/cli); until it exists they are
// shown as coming soon.
const steps = [
  { command: "npx session-coach init", what: "Adds the SessionEnd hook to Claude Code." },
  { command: "session-coach login", what: "Signs the CLI in with a token from the list below." },
  {
    command: "session-coach push --latest",
    what: "Uploads a session that ended before you set up.",
  },
];

export default function SetupPage() {
  // SAMPLE tokens until Phase 3; times as words, measured from the sample clock.
  const tokens = sampleTokens.map(({ id, label, created_at, last_used_at }) => ({
    id,
    label,
    created: formatRelativeTime(created_at, SAMPLE_NOW) ?? "None",
    lastUsed: last_used_at ? formatRelativeTime(last_used_at, SAMPLE_NOW) : null,
  }));

  return (
    <Container>
      <AppPageHeader
        title="Setup"
        description="Connect Claude Code, so each session you finish becomes decision cards."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Install the CLI</h2>
          </CardTitle>
          <CardDescription>The CLI isn&apos;t published yet.</CardDescription>
          <CardAction>
            <Badge>Coming soon</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {steps.map(({ command, what }, index) => (
              <li key={command} className="flex flex-col gap-2">
                <p className="type-body">
                  {index + 1}. {what}
                </p>
                <CodeBlock variant="command" command={command} />
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>What the hook uploads</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="type-body">
            When a Claude Code session ends, the SessionEnd hook hands its log to a background
            worker on your laptop. The worker redacts secrets locally, compresses the log and
            uploads it. If you are offline it keeps the log in <Code>~/.session-coach/outbox/</Code>{" "}
            and tries again.
          </p>
          <p className="type-body">
            The server redacts again, then keeps your prompts, the agent&apos;s replies, file edit
            summaries and shell commands. It drops thinking blocks and attachments.
          </p>
          <p className="type-body">
            Cards are written by a model. The free tier of Gemini may use what it reads to improve
            Google&apos;s products, which is why redaction stays strict.
          </p>
          <p>
            <Link href="/privacy" className={buttonVariants({ variant: "link" })}>
              Read the privacy policy
            </Link>
          </p>
        </CardContent>
      </Card>

      <TokenSection initialTokens={tokens} sampleToken={SAMPLE_TOKEN} />
    </Container>
  );
}
