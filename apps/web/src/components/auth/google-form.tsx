"use client";

import { GoogleLogoIcon } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";

import { signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="lg" disabled={pending}>
      <GoogleLogoIcon weight="bold" data-icon="inline-start" aria-hidden />
      Continue with Google
    </Button>
  );
}

/** "Continue with Google": a POST to the signInWithGoogle Server Action, which sends the browser on to Google. */
export function GoogleForm({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle} className="flex flex-col">
      <input type="hidden" name="next" value={next ?? ""} />
      <GoogleButton />
    </form>
  );
}
