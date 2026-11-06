"use client";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { LoadErrorState } from "@/components/errors/load-error-state";

// Keeps the page's title, so the member still knows where they are, over the framed load error.
export default function TrackerError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <AppPageHeader title="Tracker" />
      <LoadErrorState error={error} retry={retry} noun="the tracker" />
    </Container>
  );
}
