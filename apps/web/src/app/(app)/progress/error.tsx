"use client";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { LoadErrorState } from "@/components/errors/load-error-state";

// Keeps the page's title, so the learner still knows where they are, over the framed load error.
export default function ProgressError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <AppPageHeader title="Progress" />
      <LoadErrorState error={error} retry={retry} noun="your progress" />
    </Container>
  );
}
