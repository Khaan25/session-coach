"use client";

import { Container } from "@/components/app/container";
import { LoadErrorState } from "@/components/errors/load-error-state";

export default function ProgressError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <LoadErrorState error={error} retry={retry} noun="your progress" />
    </Container>
  );
}
