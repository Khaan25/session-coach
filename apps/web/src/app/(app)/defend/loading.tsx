import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { DefendColumn, DefendFlow } from "@/components/defend/defend-flow";

// Shown while the route itself loads; the same skeleton the page's own Suspense draws.
export default function DefendLoading() {
  return (
    <Container>
      <DefendColumn>
        <MeasuredSkeleton label="Loading Defend it">
          <DefendFlow defendable={9} />
        </MeasuredSkeleton>
      </DefendColumn>
    </Container>
  );
}
