import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { LoadFailedState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { RefreshButton } from "@/components/setup/refresh-button";
import { TokenSection, TokenSectionLoading } from "@/components/setup/token-section";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, CodeBlock } from "@/components/ui/code-block";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/relative-time";
import { listTokens, type TokenRow } from "@/lib/tokens/queries";

export const metadata: Metadata = { title: "Setup" };

// The commands packages/cli ships (session-coach on npm). Keep in step with its USAGE.
const steps = [
  {
    command: "npx session-coach login",
    what: "Signs the CLI in with a token from the list below.",
  },
  {
    command: "npx session-coach push --latest",
    what: "Uploads the last Claude Code session you ran in this folder.",
  },
  {
    command: "npx session-coach push <file.jsonl>",
    what: "Or uploads one session log by its path.",
  },
];

export default function SetupPage() {
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
          <CardDescription>Needs Node 20 or later.</CardDescription>
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
            <h2>What a push uploads</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="type-body">
            The CLI reads the session&apos;s log from <Code>~/.claude/projects/</Code>, redacts
            secrets on your laptop, compresses the log and uploads it.
          </p>
          <p className="type-body">
            The server redacts again, then keeps your prompts, the agent&apos;s replies, file edit
            summaries and shell commands. It drops thinking blocks and attachments.
          </p>
          <p className="type-body">
            Cards are written by a model through Groq&apos;s API, which is why redaction stays
            strict.
          </p>
          <p>
            <Link href="/privacy" className={buttonVariants({ variant: "link" })}>
              Read the privacy policy
            </Link>
          </p>
        </CardContent>
      </Card>

      <Suspense fallback={<TokenSectionLoading />}>
        <Tokens />
      </Suspense>
    </Container>
  );
}

// Reads the signed-in learner's tokens through RLS, so it renders inside Suspense (cacheComponents).
async function Tokens() {
  const user = await getCurrentUser();
  if (!user) return <TokenSection initialTokens={[]} />;
  const loaded = await load(user.id);
  if (!loaded) {
    return (
      <Card>
        <LoadFailedState noun="your tokens" variant="plain" action={<RefreshButton />} />
      </Card>
    );
  }
  const { now, tokens } = loaded;
  return (
    <TokenSection
      initialTokens={tokens.map(({ id, label, created_at, last_used_at }) => ({
        id,
        label: label ?? "Untitled token",
        created: formatRelativeTime(created_at, now) ?? "None",
        lastUsed: last_used_at ? formatRelativeTime(last_used_at, now) : null,
      }))}
    />
  );
}

/** Reads the clock outside render, then the tokens; null when the read fails (logged, not shown). */
async function load(userId: string): Promise<{ now: Date; tokens: TokenRow[] } | null> {
  const now = new Date();
  try {
    return { now, tokens: await listTokens(userId) };
  } catch (err) {
    console.error("[setup] token list failed", err instanceof Error ? err.message : err);
    return null;
  }
}
