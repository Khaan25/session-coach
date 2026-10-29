"use client";

import { useEffect } from "react";

import { LoadFailedState } from "@/components/app/error-state";
import { Container } from "@/components/app/container";
import { Button } from "@/components/ui/button";

export default function ProgressError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container>
      <LoadFailedState noun="your progress" action={<Button onClick={retry}>Try again</Button>} />
    </Container>
  );
}
