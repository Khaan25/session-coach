"use client";

import { useDryRun } from "@/components/app/dry-run";
import { Button } from "@/components/ui/button";

import { signOutEverywhere } from "@/app/(auth)/actions";

/** Signs out every browser and device through the Server Action; on /canvas (DryRunContext) the button does nothing. */
export function SignOutEverywhereForm() {
  const dryRun = useDryRun();
  return (
    <form action={dryRun ? undefined : signOutEverywhere}>
      <Button type={dryRun ? "button" : "submit"} variant="secondary" size="sm">
        Sign out everywhere
      </Button>
    </form>
  );
}
