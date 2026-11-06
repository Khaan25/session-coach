import Link from "next/link";

import { AppPageHeader } from "@/components/app/page-header";
import { AiSetupCard } from "@/components/setup/ai-setup-card";
import { buttonVariants } from "@/components/ui/button";

/**
 * /setup: the header, the AI setup prompt, the by-hand steps, one line on what a push uploads, and the connected devices. The
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

      <p className="type-body-sm text-text-2">
        What a push uploads: your session log, after the CLI removes the secrets it recognises
        (best-effort). The server redacts again before a third-party model writes the cards.{" "}
        <Link href="/privacy" className={buttonVariants({ variant: "link" })}>
          Read the privacy policy
        </Link>
      </p>

      {devices}
    </>
  );
}
