import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Sprite } from "@/components/art/sprite";
import { Container } from "@/components/app/container";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { SessionListLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { SessionList } from "@/components/sessions/session-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { getCurrentUser } from "@/lib/auth/current-user";
import { dueTodayCount } from "@/lib/review/queries";
import { listSessions } from "@/lib/sessions/queries";
import { PAGE_SIZE, parsePage } from "@/lib/sessions/rows";

export const metadata: Metadata = { title: "Dashboard" };

// shortcut: the page is read from searchParams directly; nuqs isn't installed (no new dependencies this phase).
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Container>
      <AppPageHeader
        title="Dashboard"
        description="Explain back the decisions your coding agent made."
      />
      <Suspense
        fallback={
          <Card>
            <SessionListLoading />
          </Card>
        }
      >
        <Sessions searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Sessions({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <NoSessionsEmpty />;
  const page = parsePage((await searchParams).page);
  const { now, sessions, hasMore, due } = await load(user.id, page);
  return (
    <>
      {due > 0 && (
        <Item variant="outline">
          <ItemMedia className="hidden sm:flex">
            <Sprite name="cards" className="w-14" />
          </ItemMedia>
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
        <SessionList
          key={page}
          sessions={sessions}
          userId={user.id}
          now={now.toISOString()}
          prepend={page === 1}
          limit={PAGE_SIZE}
        />
        {(page > 1 || hasMore) && (
          <CardFooter>
            <nav aria-label="Session pages" className="flex w-full justify-between gap-2">
              {page > 1 ? (
                <Link
                  href={page === 2 ? "/dashboard" : `/dashboard?page=${page - 1}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Newer
                </Link>
              ) : (
                <span />
              )}
              {hasMore && (
                <Link
                  href={`/dashboard?page=${page + 1}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Older
                </Link>
              )}
            </nav>
          </CardFooter>
        )}
      </Card>
    </>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then both queries. */
async function load(userId: string, page: number) {
  const now = new Date();
  const [{ sessions, hasMore }, due] = await Promise.all([
    listSessions({ userId, page }),
    dueTodayCount(userId, now),
  ]);
  return { now, sessions, hasMore, due };
}
