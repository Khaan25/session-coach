import Link from "next/link";
import { ArrowRightIcon, CodeIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { OwnershipRing, LearningMark } from "@/components/art/engineering-illustrations";
import { EngineerMeadow } from "@/components/art/engineer-meadow";
import { EmptyState } from "@/components/app/empty-state";
import { ProjectTabs, type ProjectTab } from "@/components/app/project-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { dueInWords, type Step } from "@/lib/review/schedule";
import type { Ownership } from "@/lib/progress/ownership";
import type { EmptyQueue, QueueCard } from "@/lib/review/queries";
export const SAMPLE_ANATOMY = {
  decision: "Rate limit the upload route per token, not per IP",
  question: "Why is the limit keyed on the token rather than the IP?",
  step: 2,
} as const;
export type DashboardViewProps = {
  firstVisit: boolean;
  before?: React.ReactNode;
  tabs: ProjectTab[] | null;
  repo: string | null;
  queue: QueueCard[];
  due: QueueCard[];
  empty: EmptyQueue | null;
  ownership: Ownership | null;
  anatomy: { decision: string; question: string; step: Step } | null;
  sessions: React.ReactNode;
  pager?: React.ReactNode;
};
export function DashboardView({
  firstVisit,
  before,
  tabs,
  repo,
  queue,
  due,
  empty,
  ownership,
  sessions,
  pager,
}: DashboardViewProps) {
  const first = due[0],
    other = queue[0];
  const hasCards = Boolean(ownership && ownership.overall.total > 0);
  const done = hasCards && !queue.length;
  const nextDate = empty?.nextDue ? dueInWords(empty.nextDue, empty.today) : null;
  const content = (
    <div className="studio-dashboard">
      <section className="studio-today" aria-labelledby="today-heading">
        <div className="studio-today-copy">
          <p className="studio-eyebrow">YOUR NEXT FEW MINUTES</p>
          <h1 id="today-heading">
            {first
              ? `${due.length} ${due.length === 1 ? "decision" : "decisions"} to review.`
              : firstVisit
                ? "Your first session starts here."
                : repo && other
                  ? `${repo} is up to date.`
                  : done
                    ? "You’re done for today."
                    : "Your work becomes understanding."}
          </h1>
          <p>
            {first
              ? "Keep the reasoning behind the code you shipped."
              : firstVisit
                ? "Connect your agent and finish a session to find the choices worth keeping."
                : other
                  ? "There are decisions ready in your other projects."
                  : empty?.doneToday
                    ? "You can review again tomorrow."
                    : nextDate
                      ? `Your next review is ${nextDate}.`
                      : "Open your sessions to see what is ready."}
          </p>
          <Link
            href={
              first
                ? `/review/${first.id}?step=1&total=${due.length}${repo ? `&repo=${encodeURIComponent(repo)}` : ""}`
                : firstVisit
                  ? "/setup"
                  : other
                    ? "/review"
                    : hasCards
                      ? "/progress"
                      : "/sessions"
            }
            className={buttonVariants({ size: "lg" })}
          >
            {first
              ? "Start review"
              : firstVisit
                ? "Connect your agent"
                : other
                  ? "Review other projects"
                  : hasCards
                    ? "See your progress"
                    : "View your sessions"}
            <ArrowRightIcon aria-hidden />
          </Link>
        </div>
        <div className="studio-next-choice">
          <EngineerMeadow placement="dashboard" />
          {first ? (
            <>
              <span className="studio-eyebrow">
                <LearningMark kind="explain" size="small" /> UP NEXT ·{" "}
                {first.repo ?? first.sessionName}
              </span>
              <blockquote>{first.decision}</blockquote>
            </>
          ) : (
            <p>
              <CheckIcon aria-hidden />A little practice, grounded in your own work.
            </p>
          )}
        </div>
      </section>
      {ownership && ownership.repos.length > 0 && (
        <section className="studio-project-section" aria-labelledby="projects-heading">
          <div className="studio-section-bar">
            <h2 id="projects-heading">Your projects</h2>
            <Link href="/progress">
              See your progress <ArrowRightIcon aria-hidden />
            </Link>
          </div>
          <div className="studio-project-grid">
            {ownership.repos
              .filter((p) => !repo || p.repo === repo)
              .map((p) => (
                <Link
                  key={p.repo ?? ""}
                  className="studio-project-tile learning-project-row"
                  href={p.repo ? `/progress?repo=${encodeURIComponent(p.repo)}` : "/progress"}
                  aria-label={`View progress for ${p.repo ?? "No project"}`}
                >
                  <div className="dashboard-project-heading">
                    <LearningMark kind="session" />
                    <h3>{p.repo ?? "No project"}</h3>
                    <ArrowRightIcon aria-hidden />
                  </div>
                  <div className="dashboard-project-visual">
                    <OwnershipRing owned={p.owned} total={p.total} identity={p.repo ?? ""} />
                    <div>
                      <strong>
                        {p.owned} of {p.total} owned
                      </strong>
                      <p>{p.explained} explained</p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
      <section className="studio-recent-sessions">
        <div className="studio-section-bar">
          <h2>Recent sessions</h2>
          <Link href="/sessions">
            All sessions <ArrowRightIcon aria-hidden />
          </Link>
        </div>
        {sessions}
        {pager}
      </section>
      <Collapsible>
        <CollapsibleRow>How your learning works</CollapsibleRow>
        <CollapsibleContent>
          <p className="learning-footnote">
            Explain a decision before the answer is revealed, recall it on day 1, 4 and 11, and
            defend it when you want to test the reasoning further.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
  return (
    <>
      {before}
      {tabs ? (
        <ProjectTabs tabs={tabs} repo={repo}>
          {content}
        </ProjectTabs>
      ) : (
        content
      )}
    </>
  );
}
export function FirstSessionEmpty() {
  return (
    <EmptyState
      icon={CodeIcon}
      title="Send your first session"
      description="Connect your agent once, then learn from the decisions in the work you finish."
      action={
        <Link href="/setup" className={buttonVariants()}>
          Connect your agent
        </Link>
      }
    />
  );
}
