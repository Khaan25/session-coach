import Link from "next/link";

import { Container } from "@/components/app/container";
import { ErrorState } from "@/components/app/error-state";
import { buttonVariants } from "@/components/ui/button";

// Shown when an (app) page calls notFound() (a session or card that is gone or not the learner's), inside the app
// shell. Unknown URLs never reach it: they go to the root not-found.tsx.
export default function AppNotFound() {
  return (
    <Container>
      <ErrorState
        status="warn"
        statusWord="Not found"
        title={<h1>We couldn&apos;t find that</h1>}
        message="It may have been deleted, or it belongs to another account."
        action={
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            Back to the dashboard
          </Link>
        }
      />
    </Container>
  );
}
