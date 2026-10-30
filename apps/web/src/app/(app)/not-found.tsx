import { Container } from "@/components/app/container";
import { NotFoundState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";

// Shown when an (app) page calls notFound() (a session or card that is gone or not the learner's), inside the app
// shell. Unknown URLs never reach it: they go to the root not-found.tsx.
export default function AppNotFound() {
  return (
    <Container>
      <AppPageHeader title="Not found" />
      <NotFoundState noun="Page" />
    </Container>
  );
}
