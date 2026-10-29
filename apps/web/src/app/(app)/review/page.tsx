import type { Metadata } from "next";
import Link from "next/link";

import { NoCardsDueEmpty } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemTitle,
} from "@/components/ui/item";
import { sampleQueue, stepLabels } from "@/lib/sample/cards";

export const metadata: Metadata = { title: "Review" };

// SAMPLE queue until Phase 6. TODO(zia): reviews.due_on <= today in the learner's timezone, not mastered, plus
// never-reviewed cards from the last 7 days, oldest due first; one shared function in src/lib/review/.
export default function ReviewPage() {
  const first = sampleQueue[0];
  return (
    <Container>
      <AppPageHeader
        title="Review"
        description="Explain each decision back in your own words. Each card comes back on day 1, 3 and 7."
        actions={
          first && (
            // TODO(zia): "Start review" walks the queue in order; the quiz needs a "next card" link for that.
            <Link href={`/review/${first.id}`} className={buttonVariants()}>
              Start review
            </Link>
          )
        }
      />
      {first ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Due today</h2>
            </CardTitle>
            <CardDescription>Cards due today, then new cards from the last 7 days.</CardDescription>
          </CardHeader>
          <ItemGroup>
            {sampleQueue.map((card) => (
              // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
              <Item key={card.id} role="listitem">
                <ItemContent>
                  <ItemTitle>
                    <ItemLink href={`/review/${card.id}`}>{card.decision}</ItemLink>
                  </ItemTitle>
                  <ItemDescription>{card.sessionTitle}</ItemDescription>
                </ItemContent>
                <Badge>{stepLabels[card.step]}</Badge>
              </Item>
            ))}
          </ItemGroup>
        </Card>
      ) : (
        <NoCardsDueEmpty />
      )}
    </Container>
  );
}
