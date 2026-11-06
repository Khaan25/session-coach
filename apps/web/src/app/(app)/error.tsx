"use client";

import { Container } from "@/components/app/container";
import { LoadErrorState } from "@/components/errors/load-error-state";

// Renders inside the (app) layout, so the sidebar and top bar stay and the learner can move on from there. Pages
// with their own error.tsx keep their title over the same framed error; this catches the rest.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <LoadErrorState error={error} retry={retry} noun="this page" />
    </Container>
  );
}
