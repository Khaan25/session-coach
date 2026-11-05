import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { DashboardView, FirstSessionEmpty } from "@/components/dashboard/dashboard-view";
import {
  SAMPLE_NOW,
  SAMPLE_OWNERSHIP,
  SAMPLE_QUEUE,
  SAMPLE_SESSIONS,
} from "@/components/dashboard/dashboard-sample";
import { ProjectSetup } from "@/components/projects/project-setup";
import { SessionList, SessionRows } from "@/components/sessions/session-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOwnership } from "@/lib/progress/queries";
import { listProjects } from "@/lib/projects/queries";
import { emptyQueue, reviewQueue } from "@/lib/review/queries";
import { listSessions } from "@/lib/sessions/queries";
import { PAGE_SIZE, parsePage, parseRepo } from "@/lib/sessions/rows";

export const metadata: Metadata = { title: "Dashboard" };

// shortcut: the page and repo are read from searchParams directly; nuqs isn't installed (no new dependencies this phase).
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Container>
      {/* Skullet measures the real blocks, drawn from sample data, so each keeps its shape when the data lands. The
          row counts, the filter and the page links aren't known until then, so the blocks can still grow or shrink. */}
      <MeasuredSuspense
        label="Loading your dashboard"
        skeleton={
          <DashboardView
            firstVisit={false}
            tabs={null}
            repo={null}
            queue={SAMPLE_QUEUE}
            due={SAMPLE_QUEUE}
            empty={null}
            ownership={SAMPLE_OWNERSHIP}
            anatomy={null}
            sessions={<SessionRows rows={SAMPLE_SESSIONS} now={SAMPLE_NOW} />}
          />
        }
      >
        <Dashboard searchParams={searchParams} />
      </MeasuredSuspense>
    </Container>
  );
}

/** The dashboard's URL for a page of sessions, keeping the repo filter. */
function dashboardHref(repo: string | null, page = 1) {
  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/dashboard?${params}` : "/dashboard";
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <NoSessionsEmpty />;
  const params = await searchParams;
  const page = parsePage(params.page);
  const repo = parseRepo(params.repo);
  const { now, sessions, hasMore, queue, repos, ownership } = await load(user.id, page, repo);
  // A repo the learner has no session in: show every session rather than an empty list.
  if (repo && repos && !repos.includes(repo)) redirect("/dashboard");
  // Past the last page: go to the first rather than show "no sessions yet".
  if (page > 1 && sessions.length === 0) redirect(dashboardHref(repo));
  const firstVisit = !repo && page === 1 && sessions.length === 0;
  const due = repo ? queue.filter((card) => card.repo === repo) : queue;
  const next = due[0] ?? queue[0];
  const empty = await loadEmpty(user.id, now, queue.length > 0 || firstVisit);

  return (
    <DashboardView
      firstVisit={firstVisit}
      before={<ProjectSetup />}
      tabs={
        repos?.length
          ? [null, ...repos].map((name) => ({ repo: name, href: dashboardHref(name) }))
          : null
      }
      repo={repo}
      queue={queue}
      due={due}
      empty={empty}
      ownership={ownership}
      // The queue carries the question but never the why, the evidence or the answer key.
      anatomy={next ? { decision: next.decision, question: next.question, step: next.step } : null}
      sessions={
        <SessionList
          key={`${repo}:${page}`}
          sessions={sessions}
          userId={user.id}
          now={now.toISOString()}
          prepend={page === 1}
          repo={repo ?? undefined}
          limit={PAGE_SIZE}
          empty={firstVisit ? <FirstSessionEmpty /> : undefined}
        />
      }
      pager={
        (page > 1 || hasMore) && (
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
        )
      }
    />
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the queries. */
async function load(userId: string, page: number, repo: string | null) {
  const now = new Date();
  const [{ sessions, hasMore }, queue, projects, ownership] = await Promise.all([
    listSessions({ userId, page, repo }),
    reviewQueue(userId, now),
    // Only the filter links need it, so a failed read hides them instead of failing the session list.
    listProjects(userId).catch((error: unknown) => {
      console.error("[dashboard] listProjects", error);
      return null;
    }),
    // A summary above the list: a failed read hides the meter rather than taking the dashboard down. /progress shows
    // the error.
    getOwnership().catch((error: unknown) => {
      console.error("[dashboard] getOwnership", error);
      return null;
    }),
  ]);
  return {
    now,
    sessions,
    hasMore,
    queue,
    repos: projects?.map((project) => project.repo) ?? null,
    ownership,
  };
}

/** Why the queue is empty, read only when it is (and not on a first visit). Optional: a failure falls back, never throws. */
async function loadEmpty(userId: string, now: Date, skip: boolean) {
  if (skip) return null;
  return emptyQueue(userId, now).catch((error: unknown) => {
    console.error("[dashboard] emptyQueue", error);
    return null;
  });
}
