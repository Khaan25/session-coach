import { DecisionScene } from "@/components/art/engineering-illustrations";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { SessionList } from "@/components/sessions/session-list";
import { ProjectPicker } from "@/components/projects/project-picker";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProgress } from "@/lib/progress/queries";
import { parseProjectScope, projectHref } from "@/lib/projects/scope";
import { listSessions } from "@/lib/sessions/queries";
import { parsePage, PAGE_SIZE } from "@/lib/sessions/rows";
export const metadata: Metadata = { title: "Your sessions" };
export default function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  return (
    <Container className="learning-sessions-page">
      <div className="coach-page-intro">
        <AppPageHeader title="The work behind your decisions." />
        <DecisionScene variant="session" />
      </div>
      <MeasuredSuspense label="Loading sessions" skeleton={<p>Opening your sessions.</p>}>
        <Sessions searchParams={searchParams} />
      </MeasuredSuspense>
    </Container>
  );
}
async function Sessions({ searchParams }: Pick<PageProps<"/sessions">, "searchParams">) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) return null;
  const scope = parseProjectScope(
      params.project ?? (typeof params.repo === "string" ? "repo:" + params.repo : null),
    ),
    page = parsePage(params.page),
    now = readClock();
  const [listed, progress] = await Promise.all([
    listSessions({ userId: user.id, page, scope }),
    getProgress(user.id, now, scope),
  ]);
  return (
    <>
      <ProjectPicker scope={scope} projects={progress.byProject} path="/sessions" />
      <SessionList
        sessions={listed.sessions}
        userId={user.id}
        now={now.toISOString()}
        prepend={page === 1}
        limit={PAGE_SIZE}
        scope={scope}
      />
      <nav className="learning-session-navigation" aria-label="Session pages">
        {page > 1 && (
          <Link href={projectHref("/sessions?page=" + (page - 1), scope)}>Newer sessions</Link>
        )}
        {listed.hasMore && (
          <Link href={projectHref("/sessions?page=" + (page + 1), scope)}>Older sessions</Link>
        )}
      </nav>
    </>
  );
}

function readClock() {
  return new Date();
}
