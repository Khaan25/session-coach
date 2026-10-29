import { Container } from "@/components/app/container";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";

// TODO(zia): the learner's sessions, stats and due cards (Phase 4); until then, the empty state.
export default function DashboardPage() {
  return (
    <Container>
      <AppPageHeader
        title="Dashboard"
        description="Explain back the decisions your coding agent made."
      />
      <NoSessionsEmpty />
    </Container>
  );
}
