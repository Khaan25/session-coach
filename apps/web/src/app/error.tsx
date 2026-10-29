"use client";

import { ErrorPage } from "@/components/errors/error-page";

// Catches errors under the root layout outside (app), which has its own boundary. Errors in the root layout itself go
// to global-error.tsx.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorPage error={error} retry={retry} />;
}
