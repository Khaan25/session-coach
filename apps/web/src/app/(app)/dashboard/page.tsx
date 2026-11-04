import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Sprite } from "@/components/art/sprite";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { ProjectSetup } from "@/components/projects/project-setup";
import { SessionRow } from "@/components/app/session-row";
import { SessionList } from "@/components/sessions/session-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOwnership } from "@/lib/progress/queries";
import { listProjects } from "@/lib/projects/queries";
import { dueTodayCount } from "@/lib/review/queries";
import { listSessions } from "@/lib/sessions/queries";
import { PAGE_SIZE, parsePage, parseRepo, type SessionListItem } from "@/lib/sessions/rows";

export const metadata: Metadata = { title: "Dashboard" };

// Only the skeleton's shape comes from these: text lengths and statuses like a real list.
const SAMPLE_NOW = new Date("2026-01-01T12:00:00Z");
const sample = (
  i: number,
  title: string,
  status: SessionListItem["status"],
  cardCount?: number,
): Parameters<typeof SessionRow>[0]["session"] & { cardCount?: number } => ({
  id: `sample-${i}`,
  title,
  repo: "session-coach",
  branch: null,
  status,
  error: null,
  created_at: new Date(SAMPLE_NOW.getTime() - (i + 1) * 3_600_000).toISOString(),
  cardCount,
});
const SAMPLE_SESSIONS = [
  sample(0, "Add rate limiting to the upload route", "ready", 4),
  sample(1, "Move auth emails to React Email", "ready", 3),
  sample(2, "Fix the tracker's inline title edit", "processing"),
  sample(3, "Stream the CLI upload", "ready", 5),
];

// shortcut: the page and repo are read from searchParams directly; nuqs isn't installed (no new dependencies this phase).
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Container>
      <AppPageHeader
        title="Dashboard"
        description="Explain back the decisions your coding agent made."
      />
      <ProjectSetup />
      <Suspense fallback={null}>
        <Ownership />
      </Suspense>
      {/* Skullet measures the real rows, drawn from sample sessions, so each row keeps its shape when the data lands. The
          row count, due banner and page links aren't known until then, so the list can still grow or shrink. */}
      <MeasuredSuspense
        label="Loading sessions"
        skeleton={
          <Card>
            {/* skullet-own: the heading is static, so it stays real, not a bar. */}
            <CardHeader skullet-own="">
              <CardTitle>
                <h2>Sessions</h2>
              </CardTitle>
            </CardHeader>
            <ItemGroup>
              {SAMPLE_SESSIONS.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  cardCount={session.cardCount}
                  now={SAMPLE_NOW}
                />
              ))}
            </ItemGroup>
          </Card>
        }
      >
        <Sessions searchParams={searchParams} />
      </MeasuredSuspense>
    </Container>
  );
}

/** The ownership meter, once the learner has a visible card. Nothing while loading or before the first card. */
async function Ownership() {
  const user = await getCurrentUser();
  if (!user) return null;
  let ownership: Awaited<ReturnType<typeof getOwnership>>;
  try {
    ownership = await getOwnership();
  } catch (error) {
    // A summary above the list: a failed read must not take the dashboard down. /progress shows the error.
    console.error("[dashboard/Ownership]", error);
    return null;
  }
  return ownership.overall.total > 0 && <OwnershipMeter ownership={ownership} />;
}

/** The dashboard's URL for a page of sessions, keeping the repo filter. */
function dashboardHref(repo: string | null, page = 1) {
  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/dashboard?${params}` : "/dashboard";
}

async function Sessions({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <NoSessionsEmpty />;
  const params = await searchParams;
  const page = parsePage(params.page);
  const repo = parseRepo(params.repo);
  const { now, sessions, hasMore, due, repos } = await load(user.id, page, repo);
  // A repo the learner has no session in: show every session rather than an empty list.
  if (repo && repos && !repos.includes(repo)) redirect("/dashboard");
  // Past the last page: go to the first rather than show "no sessions yet".
  if (page > 1 && sessions.length === 0) redirect(dashboardHref(repo));
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
        {repos && repos.length > 0 && (
          <CardContent>
            <nav aria-label="Projects" className="flex flex-wrap gap-2">
              {[null, ...repos].map((name) => (
                <Link
                  key={name ?? ""}
                  href={dashboardHref(name)}
                  aria-current={name === repo ? "page" : undefined}
                  className={buttonVariants({
                    variant: name === repo ? "secondary" : "ghost",
                    size: "sm",
                  })}
                >
                  {name ?? "All projects"}
                </Link>
              ))}
            </nav>
          </CardContent>
        )}
        <SessionList
          key={`${repo}:${page}`}
          sessions={sessions}
          userId={user.id}
          now={now.toISOString()}
          prepend={page === 1}
          repo={repo ?? undefined}
          limit={PAGE_SIZE}
        />
        {(page > 1 || hasMore) && (
          <CardFooter>
            <nav aria-label="Session pages" className="flex w-full justify-between gap-2">
              {page > 1 ? (
                <Link
                  href={dashboardHref(repo, page - 1)}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Newer
                </Link>
              ) : (
                <span />
              )}
              {hasMore && (
                <Link
                  href={dashboardHref(repo, page + 1)}
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

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the queries. */
async function load(userId: string, page: number, repo: string | null) {
  const now = new Date();
  const [{ sessions, hasMore }, due, projects] = await Promise.all([
    listSessions({ userId, page, repo }),
    dueTodayCount(userId, now),
    // Only the filter links need it, so a failed read hides them instead of failing the session list.
    listProjects(userId).catch((error: unknown) => {
      console.error("[dashboard] listProjects", error);
      return null;
    }),
  ]);
  return { now, sessions, hasMore, due, repos: projects?.map((project) => project.repo) ?? null };
}
