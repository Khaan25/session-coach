"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * "Try again" for a failed or stuck session: POST /api/sessions/<id>/retry runs the pipeline again from the stored log,
 * then the page re-renders as processing and Realtime takes it from there.
 */
export function RetrySessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function retry() {
    setPending(true);
    const response = await fetch(`/api/sessions/${sessionId}/retry`, { method: "POST" }).catch(
      () => null,
    );
    // 409: it already moved on (another tab, a re-push); showing its current state is the answer.
    if (!response?.ok && response?.status !== 409) {
      setPending(false);
      const body: { error?: string } | null = await response?.json().catch(() => null);
      toast.add({
        type: "error",
        title: "The session wasn't retried",
        description: body?.error ?? "Check your connection and try again.",
      });
      return;
    }
    router.refresh();
  }

  return (
    <Button onClick={retry} disabled={pending}>
      Try again
    </Button>
  );
}
