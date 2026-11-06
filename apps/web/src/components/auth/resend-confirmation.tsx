"use client";

import { use, useActionState, useEffect, useState } from "react";

import { type AuthState, resendConfirmation } from "@/app/(auth)/actions";
import { useDryRun } from "@/components/app/dry-run";
import { AuthPreviewContext } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";

// Supabase sends at most one confirmation per address per 60 s (docs/plans/auth.md #2).
const COOLDOWN_S = 60;

/** "Resend the email" for an unconfirmed address, then a 60 s countdown before it can be pressed again. */
export function ResendConfirmation({ email }: { email: string }) {
  const [left, setLeft] = useState(0);
  // /canvas: answers as a sent resend would, without sending one.
  const dryRun = useDryRun();
  // A preview of a resend's answer, never the sign-in form's own (that is the notice above this button).
  const preview = use(AuthPreviewContext);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    async (prev, formData) => {
      const result = dryRun
        ? {
            status: "sent" as const,
            message: "If that address is waiting to be confirmed, we sent a new link.",
          }
        : await resendConfirmation(prev, formData);
      if (result.status === "sent") setLeft(COOLDOWN_S);
      return result;
    },
    preview?.status === "sent" ? preview : {},
  );

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="secondary" disabled={pending || left > 0}>
        {left > 0 ? `Resend in ${left} s` : "Resend the email"}
      </Button>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <p role="status" className="text-center type-body-sm text-text-2">
        {state.message}
      </p>
    </form>
  );
}
