import { Container } from "@/components/app/container";
import { NotFoundState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";

export default function SessionNotFound() {
  return (
    <Container>
      <AppPageHeader title="Session" />
      <NotFoundState />
    </Container>
  );
}
