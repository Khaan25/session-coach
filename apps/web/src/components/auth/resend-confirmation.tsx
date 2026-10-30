"use client";

import { useActionState, useEffect, useState } from "react";

import { type AuthState, resendConfirmation } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

// Supabase sends at most one confirmation per address per 60 s (docs/plans/auth.md #2).
const COOLDOWN_S = 60;

/** "Resend the email" for an unconfirmed address, then a 60 s countdown before it can be pressed again. */
export function ResendConfirmation({ email }: { email: string }) {
  const [left, setLeft] = useState(0);
  const [state, action, pending] = useActionState<AuthState, FormData>(async (prev, formData) => {
    const result = await resendConfirmation(prev, formData);
    if (result.status === "sent") setLeft(COOLDOWN_S);
    return result;
  }, {});

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="secondary" disabled={pending || left > 0}>
        {left > 0 ? `Resend in ${left} s` : "Resend the email"}
      </Button>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <p role="status" className="type-body-sm text-text-2">
        {state.message}
      </p>
    </form>
  );
}
