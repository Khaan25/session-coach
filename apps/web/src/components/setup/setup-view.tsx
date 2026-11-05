import Link from "next/link";

import { AppPageHeader } from "@/components/app/page-header";
import { AiSetupCard } from "@/components/setup/ai-setup-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";

/**
 * /setup: the header, the AI setup prompt, the by-hand steps, what a push uploads, and the connected devices. The
 * steps and the devices come in as slots: the page streams them from the learner's rows, /canvas passes them filled.
 */
export function SetupView({
  steps,
  devices,
}: {
  steps: React.ReactNode;
  devices: React.ReactNode;
}) {
  return (
    <>
      <AppPageHeader
        title="Setup"
        description="Connect Claude Code, so each session you finish becomes decision cards. Let your AI run the setup, or follow the steps by hand."
      />

      <AiSetupCard />

      {steps}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>What a push uploads</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="type-body">
            <Code>push --latest</Code> finds the session&apos;s log in{" "}
            <Code>~/.claude/projects/</Code>; <Code>push</Code> with a path reads that file. Either
            way the CLI removes the secrets it recognises on your laptop (best-effort, not a
            guarantee), compresses the log and uploads it.
          </p>
          <p className="type-body">
            The server redacts again, then keeps your prompts, the agent&apos;s replies, file edit
            summaries and shell commands. It drops thinking blocks and attachments.
          </p>
          <p className="type-body">
            Cards are written by a third-party model provider&apos;s API, which is why redaction
            stays strict.
          </p>
          <p>
            <Link href="/privacy" className={buttonVariants({ variant: "link" })}>
              Read the privacy policy
            </Link>
          </p>
        </CardContent>
      </Card>

      {devices}
    </>
  );
}
