"use client";

// /auth/confirm in the picked auth design (B, explain panel): the page an email link opens. A button, not a GET
// handler, so link scanners can't spend the one-time token. Copy from app/auth/confirm/page.tsx.

import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthHeading, AuthSwitch } from "@/components/auth/auth-parts";
import { Button } from "@/components/ui/button";

import { Glossary, PanelHeading, SplitShell } from "../options/auth";

export function MapAuthConfirm({ state }: { state: "sign-up" | "recovery" | "incomplete" }) {
  return (
    <SplitShell
      path={
        state === "incomplete"
          ? "/auth/confirm?type=signup"
          : `/auth/confirm?token_hash=…&type=${state === "recovery" ? "recovery" : "signup"}`
      }
      aside={
        <>
          <PanelHeading eyebrow="Almost there">Why a button?</PanelHeading>
          <p className="type-body text-pretty text-text-2">
            Mail scanners open links before you do. A button means only you can use the one-time
            link.
          </p>
          <Glossary />
        </>
      }
    >
      <AuthHeading
        title={
          <>
            One more <span className="italic">step</span>
          </>
        }
      >
        Press the button to finish. The link works once.
      </AuthHeading>
      {state === "incomplete" ? (
        <AuthNotice title="This link is incomplete" fail>
          Open the link from the email again, or copy the whole address into the browser.
        </AuthNotice>
      ) : (
        <AuthCard>
          <Button size="lg">
            {state === "recovery" ? "Continue to set a password" : "Confirm and sign in"}
          </Button>
        </AuthCard>
      )}
      <AuthSwitch prompt="Didn't ask for this?" href="/">
        Go home
      </AuthSwitch>
    </SplitShell>
  );
}
