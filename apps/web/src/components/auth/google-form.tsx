"use client";

import { useFormStatus } from "react-dom";

import { signInWithGoogle } from "@/app/(auth)/actions";
import { useDryRun } from "@/components/app/dry-run";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

function GoogleButton({ dryRun }: { dryRun: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type={dryRun ? "button" : "submit"} variant="secondary" disabled={pending}>
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}

/**
 * "Continue with Google": a POST to the signInWithGoogle Server Action, which sends the browser on to Google. Under
 * DryRunContext (/canvas) the button does nothing.
 */
export function GoogleForm({ next }: { next?: string }) {
  const dryRun = useDryRun();
  return (
    <form action={dryRun ? undefined : signInWithGoogle} className="flex flex-col">
      <input type="hidden" name="next" value={next ?? ""} />
      <GoogleButton dryRun={dryRun} />
    </form>
  );
}
