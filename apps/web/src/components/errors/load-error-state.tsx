"use client";

import { useEffect, useRef } from "react";

import { LoadFailedState, OfflineState } from "@/components/app/error-state";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/hooks/use-online";

/** The digest Next attaches to a server error, to match the server logs. Never the message or the stack. */
function digestOf(error: unknown) {
  return error instanceof Error && "digest" in error && typeof error.digest === "string"
    ? error.digest
    : undefined;
}

/**
 * What a page's error boundary shows when its data didn't load: offline when the browser has no connection (and a
 * retry by itself once it reconnects), otherwise the load-failed state with Try again and the digest as the reference
 * code for support.
 *
 * @param noun - What didn't load, as in "Couldn't load your sessions".
 */
export function LoadErrorState({
  error,
  retry,
  noun,
}: {
  error: unknown;
  retry: () => void;
  noun: string;
}) {
  const online = useOnline();
  const wasOffline = useRef(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      retry();
    }
  }, [online, retry]);

  const action = <Button onClick={() => retry()}>Try again</Button>;
  const digest = digestOf(error);
  return online ? (
    <LoadFailedState noun={noun} action={action} code={digest && `Ref ${digest}`} />
  ) : (
    <OfflineState noun={noun} action={action} />
  );
}
