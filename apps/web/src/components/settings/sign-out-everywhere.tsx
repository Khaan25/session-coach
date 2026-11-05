"use client";

import { useTransition } from "react";

import { useAction } from "@/components/app/dry-run";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { signOutEverywhere } from "@/app/(auth)/actions";

/**
 * Signs out every browser and device through the Server Action, which redirects on success. A failed revoke signs
 * nothing out and shows a toast, so the learner can press it again. On /canvas (DryRunContext) it does nothing.
 */
export function SignOutEverywhereForm() {
  const run = useAction(signOutEverywhere);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const { error } = await run();
          if (error) toast.add({ title: error, type: "error" });
        })
      }
    >
      {pending && <Spinner label="" />}
      Sign out everywhere
    </Button>
  );
}
