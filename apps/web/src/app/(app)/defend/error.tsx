"use client";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { DefendColumn } from "@/components/defend/defend-flow";
import { LoadErrorState } from "@/components/errors/load-error-state";

// Keeps the page's title and column, so the learner still knows where they are, over the framed load error.
export default function DefendError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <DefendColumn>
        <AppPageHeader title="Defend it" />
        <LoadErrorState error={error} retry={retry} noun="Defend it" />
      </DefendColumn>
    </Container>
  );
}
