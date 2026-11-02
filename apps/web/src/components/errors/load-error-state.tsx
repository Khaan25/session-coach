"use client";

import { useEffect, useRef } from "react";

import { LoadFailedState, OfflineState } from "@/components/app/error-state";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/hooks/use-online";

/**
 * What a page's error boundary shows when its data didn't load: offline when the browser has no connection (and a
 * retry by itself once it reconnects), otherwise the load-failed state with Try again.
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
  return online ? (
    <LoadFailedState noun={noun} action={action} />
  ) : (
    <OfflineState noun={noun} action={action} />
  );
}
