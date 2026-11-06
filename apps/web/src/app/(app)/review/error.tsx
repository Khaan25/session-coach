"use client";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { LoadErrorState } from "@/components/errors/load-error-state";

// Keeps the page's title and width, so the learner still knows where they are, over the framed load error.
export default function ReviewError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <div className="flex flex-col gap-6">
        <AppPageHeader title="Review" />
        <LoadErrorState error={error} retry={retry} noun="your review queue" />
      </div>
    </Container>
  );
}
