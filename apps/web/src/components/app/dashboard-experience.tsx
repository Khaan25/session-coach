import { DecisionScene, EngineeringGuide } from "@/components/art/engineering-illustrations";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { ProjectSetup } from "@/components/projects/project-setup";
import { ProjectPicker } from "@/components/projects/project-picker";
import { ProjectOwnershipList } from "@/components/progress/ownership-visuals";
import { SessionList } from "@/components/sessions/session-list";
import { buttonVariants } from "@/components/ui/button";
import { projectHref, projectLabel, type ProjectScope } from "@/lib/projects/scope";
import type { Progress } from "@/lib/progress/progress";
import type { EmptyQueue, QueueCard } from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import type { SessionListItem } from "@/lib/sessions/rows";

export function DashboardExperience({
  scope,
  progress,
  queue,
  returnToReview,
  sessions,
  hasMore,
  page,
  now,
  userId,
  limit,
}: {
  scope: ProjectScope;
  progress: Progress;
  queue: QueueCard[];
  returnToReview?: EmptyQueue;
  sessions: SessionListItem[];
  hasMore: boolean;
  page: number;
  now: string;
  userId: string;
  limit: number;
}) {
  const first = queue[0];
  const newLearner = progress.totalCards === 0 && sessions.length === 0;
  const noDecisions = progress.totalCards === 0;
  const waiting = sessions.some(
    (session) => session.status === "pending" || session.status === "processing",
  );
  const next = returnToReview?.nextDue
    ? dueInWords(returnToReview.nextDue, returnToReview.today)
    : null;
  return (
    <>
      <section
        className="learning-today coach-today"
        data-has-review={Boolean(first)}
        aria-labelledby="today-heading"
      >
        <div className="coach-today-copy">
          <p className="coach-kicker">Today</p>
          <h1 id="today-heading">
            {first
              ? queue.length + " " + (queue.length === 1 ? "decision" : "decisions") + " to review."
              : newLearner
                ? "Your first session starts here."
                : noDecisions
                  ? waiting
                    ? "Your decisions are on their way."
                    : "Your next decision starts with your work."
                  : scope !== "all"
                    ? projectLabel(scope) + " is up to date."
                    : "You’re done for today."}
          </h1>
          {!first && (
            <p>
              {newLearner
                ? "Connect your agent to start learning from the decisions in your work."
                : noDecisions
                  ? waiting
                    ? "Your session is being read."
                    : "Open your sessions to see what’s ready."
                  : returnToReview?.doneToday
                    ? "You can review again tomorrow."
                    : next
                      ? "Your next review is " + next + "."
                      : "New work will bring new decisions."}
            </p>
          )}
          <Link
            href={
              projectHref(
                newLearner
                  ? "/setup"
                  : first
                    ? "/review/" + first.id
                    : noDecisions
                      ? "/sessions"
                      : "/progress",
                scope,
              ) + (first ? (scope === "all" ? "?" : "&") + "step=1&total=" + queue.length : "")
            }
            className={buttonVariants({ size: "lg" })}
          >
            {newLearner
              ? "Connect your agent"
              : first
                ? "Start review"
                : noDecisions
                  ? "View your sessions"
                  : "See your progress"}
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Link>
        </div>
        {!first && (
          <div className="engineering-today-guide">
            <EngineeringGuide
              pose={newLearner ? "connect" : noDecisions ? "reflect" : "complete"}
              size="scene"
            />
          </div>
        )}
        {first && (
          <aside className="coach-next-decision" aria-label="Your next decision">
            <DecisionScene variant="review" />
            <p className="coach-kicker">Up next</p>
            <span className="learning-project-name">{first.repo ?? first.sessionName}</span>
            <blockquote>{first.decision}</blockquote>
          </aside>
        )}
      </section>
      {scope !== "all" && (
        <ProjectPicker scope={scope} projects={progress.byProject} path="/dashboard" />
      )}
      <ProjectSetup scope={scope} />
      {progress.byProject.length > 0 && (
        <ProjectOwnershipList
          projects={
            scope === "all"
              ? progress.byProject
              : progress.byProject.filter((p) => p.scope === scope)
          }
        />
      )}
      {sessions.length > 0 && (
        <section className="learning-session-list" aria-labelledby="recent-sessions-heading">
          <h2 id="recent-sessions-heading">Recent sessions</h2>
          <SessionList
            key={scope + ":" + page}
            sessions={page === 1 ? sessions.slice(0, 5) : sessions}
            userId={userId}
            now={now}
            prepend={page === 1}
            limit={page === 1 ? Math.min(limit, 5) : limit}
            scope={scope}
          />
          <nav className="learning-session-navigation" aria-label="Session pages">
            {page > 1 && (
              <Link
                href={projectHref(
                  page === 2 ? "/dashboard" : "/dashboard?page=" + (page - 1),
                  scope,
                )}
              >
                Newer sessions
              </Link>
            )}
            {page === 1 && sessions.length > 5 && (
              <Link href={projectHref("/sessions", scope)}>All sessions</Link>
            )}
            {hasMore && (
              <Link href={projectHref("/dashboard?page=" + (page + 1), scope)}>Older sessions</Link>
            )}
          </nav>
        </section>
      )}
    </>
  );
}
