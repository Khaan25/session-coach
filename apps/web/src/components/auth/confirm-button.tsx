"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** The confirm page's submit. Disabled while the POST runs, so a double-click can't spend the one-time token twice. */
export function ConfirmButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {children}
    </Button>
  );
}
