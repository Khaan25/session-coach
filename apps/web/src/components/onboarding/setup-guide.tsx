"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// The commands and wording follow /setup's steps (components/setup/setup-steps.tsx) and the AI setup prompt
// (lib/setup/ai-prompt.ts), which pin @latest so npx doesn't run a stale cached CLI.
const STEPS = [
  {
    title: "Sign in from your terminal",
    what: "Connects this computer to your account. It prints a code and opens your browser: check the code matches, then approve. There is no token to copy.",
    command: "npx session-coach@latest login",
  },
  {
    title: "Turn on automatic uploads",
    what: "Run it in your project's folder. It adds two hooks to the project's .claude/settings.local.json: one uploads each Claude Code session as it ends, the other catches up on any it missed.",
    command: "npx session-coach@latest init",
  },
  {
    title: "Send your newest session",
    what: "Uploads the last Claude Code session you ran in this folder now. Within a few minutes it becomes up to 5 decision cards on your dashboard.",
    command: "npx session-coach@latest push --latest",
  },
  {
    title: "Review your first card",
    what: "Explain each card back before you see its why. It comes back on day 1, day 4 and day 11, so the decision becomes yours.",
    command: null,
  },
] as const;

// Per browser, a convenience only: cleared storage opens the guide once more; blocked storage never opens it by itself.
const SEEN_KEY = "session-coach:setup-guide-seen";

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

// Nothing to subscribe to: only this component writes the key, and it holds its own open state after that.
const subscribe = () => () => {};

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: nothing to remember.
  }
}

/**
 * "Get started" for a learner with no session yet: a dialog that walks the setup one step at a time, with each step's
 * command to copy and a way to the full /setup page. `autoOpen` opens it once per browser, on a first visit; closing
 * it is remembered, and the button opens it again.
 */
export function SetupGuide({ autoOpen = false }: { autoOpen?: boolean }) {
  // The server can't see this browser's storage, so it renders the guide closed; the client reads it after hydrating.
  const seen = useSyncExternalStore(subscribe, readSeen, () => true);
  // null until the learner opens or closes it: until then a first visit's autoOpen decides.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const open = chosen ?? (autoOpen && !seen);

  const change = (next: boolean) => {
    setChosen(next);
    if (!next) markSeen();
  };
  const close = () => change(false);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger render={<Button />}>Get started</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get set up</DialogTitle>
          <DialogDescription>
            Four steps from your terminal to your first card. The commands need Node 20 or later.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {/* Announced when Back or Next changes it; focus stays on the button pressed. */}
          <p aria-live="polite" className="type-label-sm text-text-3 tabular-nums">
            Step {step + 1} of {STEPS.length}
          </p>
          <ol className="flex flex-col gap-3">
            {STEPS.map((item, index) => (
              <li key={item.title} aria-current={index === step ? "step" : undefined}>
                <div className="flex items-center gap-3">
                  {index < step ? (
                    <CheckCircleIcon
                      weight="fill"
                      aria-hidden="true"
                      className="size-6 shrink-0 text-text-3"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-row type-label-sm text-text-2 tabular-nums"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span
                    className={
                      index === step ? "type-label text-text-1" : "type-body-sm text-text-3"
                    }
                  >
                    {item.title}
                  </span>
                </div>
                {index === step && (
                  <div
                    key={step}
                    className="flex flex-col gap-3 ps-9 pt-2 duration-(--dur-200) motion-safe:animate-in motion-safe:fade-in-0"
                  >
                    <p className="type-body-sm text-pretty text-text-2">{current.what}</p>
                    {current.command && <CodeBlock variant="command" command={current.command} />}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </DialogBody>
        <DialogFooter>
          <Link href="/setup" onClick={markSeen} className={buttonVariants({ variant: "ghost" })}>
            Open setup
          </Link>
          <Button
            variant="secondary"
            disabled={step === 0}
            focusableWhenDisabled
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          {/* One button for Next and Done, so focus stays on it when the label changes. */}
          <Button onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? "Done" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
