"use client";

import { Container } from "@/components/app/container";
import { ServerErrorState } from "@/components/errors/server-error-state";

// Renders inside the (app) layout, so the sidebar and top bar stay and the learner can move on from there.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Container>
      <ServerErrorState
        error={error}
        retry={retry}
        home={{ href: "/dashboard", label: "Back to the dashboard" }}
      />
    </Container>
  );
}
