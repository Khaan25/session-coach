"use client";

// Redesign options for the onboarding routes, /setup and /cli/approve. Each route gets three different layouts that
// teach on the page itself: what a decision card is, why you answer before you see the why, what days 1, 4 and 11
// mean, what explained and owned mean, and what to do next. Synthetic data only; no answer key is ever shown.

import { LaptopIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";

import { AppFrame } from "../frames";
import { IdeaNote } from "../parts";
import { DEVICE_CODE } from "../prototype-data";

const APPROVE_PATH = `/cli/approve?code=${DEVICE_CODE}`;
const DEVICE = "sams-mbp (macOS)";

/** Approve C, one question: the code huge, two answers, and every explanation folded below. */
export function OnboardingCliApproveOptionC() {
  return (
    <AppFrame path={APPROVE_PATH} crumb="Connect the CLI" sessions={[]} dueCount={0}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-(--gutter) py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <LaptopIcon weight="duotone" className="size-8 text-text-2" aria-hidden />
          <h1 className="type-heading-lg text-text-1">Is this the code in your terminal?</h1>
          <span className="type-stat-xl text-text-1 tabular-nums">{DEVICE_CODE}</span>
          <p className="type-body-sm text-text-2">
            {DEVICE} · requested 1 minute ago · expires in 8:42
          </p>
          <div className="flex gap-3">
            <Button size="lg">Yes, approve</Button>
            <Button size="lg" variant="secondary">
              No, deny
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Collapsible defaultOpen>
            <CollapsibleRow>What does approving do?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                It gives that computer a token of its own, so it can upload your Claude Code
                sessions. Each session becomes up to 5 decision cards to explain back. Then go back
                to your terminal: it signs in by itself.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow>Why a code and not a token?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                A pasted token ends up in shell history and chat logs. This code works once and
                expires after 10 minutes.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow>Didn&rsquo;t run session-coach login?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                Deny it. Nothing is signed in, and nothing else is needed.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <IdeaNote>
          The page asks one yes-or-no question. Answers to &ldquo;what is this?&rdquo; sit folded
          under it, with the first one open for a newcomer.
        </IdeaNote>
      </div>
    </AppFrame>
  );
}
