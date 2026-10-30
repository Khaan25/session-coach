import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { SessionRow } from "@/components/app/session-row";
import { StatRow } from "@/components/app/stat-row";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { SAMPLE_NOW, sampleSessions, sampleStats } from "@/lib/sample/sessions";

export const metadata: Metadata = { title: "Dashboard" };

// SAMPLE data until Phase 4. The empty state (NoSessionsEmpty) shows on /design-system#app.
// TODO(zia): the learner's sessions (20 per page, page in the URL with nuqs), a Realtime subscription that updates
// each row's status and prepends new sessions (a client SessionList), and the due count from `reviews`.
export default function DashboardPage() {
  const due = sampleStats.cardsDueToday;
  return (
    <Container>
      <AppPageHeader
        title="Dashboard"
        description="Explain back the decisions your coding agent made."
      />
      <StatRow {...sampleStats} />
      {due > 0 && (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>
              {due} {due === 1 ? "card is" : "cards are"} due today
            </ItemTitle>
            <ItemDescription>Explain each one back to move it to its next review.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Link href="/review" className={buttonVariants()}>
              Start review
            </Link>
          </ItemActions>
        </Item>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Sessions</h2>
          </CardTitle>
        </CardHeader>
        <ItemGroup>
          {sampleSessions.map(({ session, cardCount }) => (
            <SessionRow key={session.id} session={session} cardCount={cardCount} now={SAMPLE_NOW} />
          ))}
        </ItemGroup>
      </Card>
    </Container>
  );
}
