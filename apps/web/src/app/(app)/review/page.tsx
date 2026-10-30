import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NoCardsDueEmpty } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { SessionListLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemTitle,
} from "@/components/ui/item";
import { getCurrentUser } from "@/lib/auth/current-user";
import { reviewQueue } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Review" };

const stepLabels = ["New", "Day 1", "Day 3", "Day 7"] as const;

export default function ReviewPage() {
  return (
    <Container>
      <AppPageHeader
        title="Review"
        description="Explain each decision back in your own words. Each card comes back on day 1, 3 and 7."
      />
      <Suspense
        fallback={
          <Card>
            {/* The real card's header, so the list keeps its place when the rows land. */}
            <CardHeader>
              <CardTitle>
                <h2>Due today</h2>
              </CardTitle>
              <CardDescription>
                Cards due today, then new cards from the last 7 days.
              </CardDescription>
            </CardHeader>
            <SessionListLoading />
          </Card>
        }
      >
        <Queue />
      </Suspense>
    </Container>
  );
}

async function Queue() {
  const user = await getCurrentUser();
  if (!user) return <NoCardsDueEmpty />;
  const queue = await load(user.id);
  const first = queue[0];
  if (!first) return <NoCardsDueEmpty />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Due today</h2>
        </CardTitle>
        <CardDescription>Cards due today, then new cards from the last 7 days.</CardDescription>
        <CardAction>
          <Link href={`/review/${first.id}`} className={buttonVariants()}>
            Start review
          </Link>
        </CardAction>
      </CardHeader>
      <ItemGroup>
        {queue.map((card) => (
          // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <Item key={card.id} role="listitem">
            <ItemContent>
              <ItemTitle>
                <ItemLink render={<Link href={`/review/${card.id}`} />}>{card.decision}</ItemLink>
              </ItemTitle>
              <ItemDescription>{card.sessionName}</ItemDescription>
            </ItemContent>
            <Badge>{stepLabels[card.step]}</Badge>
          </Item>
        ))}
      </ItemGroup>
    </Card>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule). */
async function load(userId: string) {
  return reviewQueue(userId, new Date());
}
